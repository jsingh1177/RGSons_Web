package MJC.RGSons.service;

import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Size;
import MJC.RGSons.repository.PriceMasterRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.SizeRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PriceMasterService {

    @Autowired
    private PriceMasterRepository priceMasterRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SizeRepository sizeRepository;

    public List<PriceMaster> getPricesByItemCode(String itemCode) {
        return priceMasterRepository.findByItemCode(itemCode);
    }

    @Transactional
    public List<PriceMaster> savePrices(List<PriceMaster> prices) {
        for (PriceMaster price : prices) {
            Optional<PriceMaster> existingPrice = priceMasterRepository.findByItemCodeAndSizeCode(price.getItemCode(), price.getSizeCode());
            if (existingPrice.isPresent()) {
                PriceMaster update = existingPrice.get();
                if (price.getPurchasePrice() != null) update.setPurchasePrice(price.getPurchasePrice());
                // Even if purchase price is null in Excel (maybe intentionally?), we might not want to overwrite it with null if it exists.
                // But the user complained "Purchase Price and MRP is not saving correctly".
                // If they provided it in Excel, it should be in the object.
                // If the object has it as null, it means Excel cell was empty or invalid.
                
                if (price.getMrp() != null) update.setMrp(price.getMrp());
                // Explicitly check for NULL in the incoming object and only update if NOT NULL is standard.
                // However, if the user wants to set it to NULL, they can't via this logic.
                // Assuming they want to UPDATE values.
                
                if (price.getItemName() != null && !price.getItemName().isEmpty()) update.setItemName(price.getItemName());
                if (price.getSizeName() != null && !price.getSizeName().isEmpty()) update.setSizeName(price.getSizeName());
                
                // FORCE UPDATE for prices if they are present in the incoming object
                // Debugging showed issues with updates.
                if (price.getPurchasePrice() != null) {
                    update.setPurchasePrice(price.getPurchasePrice());
                }
                if (price.getMrp() != null) {
                    update.setMrp(price.getMrp());
                }
                
                priceMasterRepository.save(update);
            } else {
                priceMasterRepository.save(price);
            }
        }
        return prices;
    }

    @Transactional
    public Map<String, Object> importPricesFromExcel(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int savedCount = 0;

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            List<PriceMaster> pricesToSave = new ArrayList<>();
            DataFormatter dataFormatter = new DataFormatter();
            
            Iterator<Row> rows = sheet.iterator();
            
            // Map columns
            int itemNameIdx = -1;
            int sizeNameIdx = -1;
            int purchasePriceIdx = -1;
            int mrpIdx = -1;
            
            if (rows.hasNext()) {
                Row headerRow = rows.next();
                for (Cell cell : headerRow) {
                    String header = dataFormatter.formatCellValue(cell).trim().toLowerCase();
                    if (header.contains("item") && header.contains("name")) itemNameIdx = cell.getColumnIndex();
                    else if (header.contains("size") && header.contains("name")) sizeNameIdx = cell.getColumnIndex();
                    else if (header.contains("purchase") && header.contains("price")) purchasePriceIdx = cell.getColumnIndex();
                    else if (header.contains("mrp")) mrpIdx = cell.getColumnIndex();
                }
            }
            
            // Fallback to default indices if headers not found (or no headers)
            if (itemNameIdx == -1) itemNameIdx = 0;
            if (sizeNameIdx == -1) sizeNameIdx = 1;
            if (purchasePriceIdx == -1) purchasePriceIdx = 2;
            if (mrpIdx == -1) mrpIdx = 3;
            
            int rowNum = 1;
            while (rows.hasNext()) {
                rowNum++;
                Row row = rows.next();
                
                // Check if row is empty or essential columns are missing
                String itemName = getCellValueAsString(row.getCell(itemNameIdx), dataFormatter).trim();
                if (itemName.isEmpty()) continue;
                
                String sizeName = getCellValueAsString(row.getCell(sizeNameIdx), dataFormatter).trim();
                Double purchasePrice = getCellValueAsDouble(row.getCell(purchasePriceIdx), dataFormatter);
                Double mrp = getCellValueAsDouble(row.getCell(mrpIdx), dataFormatter);

                // Find Item
                Optional<Item> itemOpt = itemRepository.findByItemNameIgnoreCase(itemName);
                if (itemOpt.isEmpty()) {
                    errors.add("Row " + rowNum + ": Item '" + itemName + "' not found");
                    continue; 
                }
                Item item = itemOpt.get();

                // Find Size
                Optional<Size> sizeOpt = sizeRepository.findByNameIgnoreCase(sizeName);
                if (sizeOpt.isEmpty()) {
                    errors.add("Row " + rowNum + ": Size '" + sizeName + "' not found");
                    continue;
                }
                Size size = sizeOpt.get();
                
                PriceMaster price = new PriceMaster();
                price.setItemCode(item.getItemCode());
                price.setItemName(item.getItemName());
                price.setSizeCode(size.getCode());
                price.setSizeName(size.getName());
                
                price.setPurchasePrice(purchasePrice);
                price.setMrp(mrp);
                
                pricesToSave.add(price);
            }
            
            savePrices(pricesToSave);
            savedCount = pricesToSave.size();
        }
        
        result.put("savedCount", savedCount);
        result.put("errors", errors);
        return result;
    }
    
    private String getCellValueAsString(Cell cell, DataFormatter dataFormatter) {
        if (cell == null) return "";
        return dataFormatter.formatCellValue(cell);
    }
    
    private Double getCellValueAsDouble(Cell cell, DataFormatter dataFormatter) {
        if (cell == null) return null;
        String val = dataFormatter.formatCellValue(cell).trim();
        if (val.isEmpty()) return null;
        try {
            // Remove currency symbols, commas, and non-numeric chars except dot
            val = val.replaceAll("[^0-9.]", "");
            return val.isEmpty() ? null : Double.parseDouble(val);
        } catch (Exception e) {
            return null;
        }
    }
}
