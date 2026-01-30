package MJC.RGSons.service;

import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Size;
import MJC.RGSons.repository.PriceMasterRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.SizeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    public List<PriceMaster> getAllPrices() {
        return priceMasterRepository.findAll();
    }

    public Page<PriceMaster> getAllPrices(Pageable pageable, String search) {
        if (search != null && !search.trim().isEmpty()) {
            return priceMasterRepository.findByItemNameContainingIgnoreCaseOrItemCodeContainingIgnoreCase(search.trim(), search.trim(), pageable);
        }
        return priceMasterRepository.findAll(pageable);
    }

    @Transactional
    public void savePrice(PriceMaster price) {
        Optional<PriceMaster> existingPrice = priceMasterRepository.findByItemCodeAndSizeCode(price.getItemCode(), price.getSizeCode());
        if (existingPrice.isPresent()) {
            PriceMaster update = existingPrice.get();
            if (price.getPurchasePrice() != null) update.setPurchasePrice(price.getPurchasePrice());
            if (price.getMrp() != null) update.setMrp(price.getMrp());
            if (price.getItemName() != null && !price.getItemName().isEmpty()) update.setItemName(price.getItemName());
            if (price.getSizeName() != null && !price.getSizeName().isEmpty()) update.setSizeName(price.getSizeName());
            
            priceMasterRepository.save(update);
        } else {
            priceMasterRepository.save(price);
        }
    }

    @Transactional
    public List<PriceMaster> savePrices(List<PriceMaster> prices) {
        for (PriceMaster price : prices) {
            savePrice(price);
        }
        return prices;
    }

    public Map<String, Object> importPricesFromExcel(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int savedCount = 0;

        System.out.println("Starting importPricesFromExcel...");

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
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
                    System.out.println("Header found: " + header + " at index " + cell.getColumnIndex());
                    
                    if (header.contains("item") && (header.contains("name") || header.contains("desc"))) itemNameIdx = cell.getColumnIndex();
                    else if (header.contains("size") || header.contains("packing") || header.contains("qty")) sizeNameIdx = cell.getColumnIndex();
                    else if (header.contains("purchase") || header.contains("rate") || header.contains("cost") || header.contains("buy")) purchasePriceIdx = cell.getColumnIndex();
                    else if (header.contains("mrp") || header.contains("sales") || header.contains("sell") || header.contains("sp")) mrpIdx = cell.getColumnIndex();
                }
            }
            
            // Fallback to default indices if headers not found (or no headers)
            if (itemNameIdx == -1) itemNameIdx = 0;
            if (sizeNameIdx == -1) sizeNameIdx = 1;
            if (purchasePriceIdx == -1) purchasePriceIdx = 2;
            if (mrpIdx == -1) mrpIdx = 3;

            System.out.println("Mapped Columns: Item=" + itemNameIdx + ", Size=" + sizeNameIdx + ", Purch=" + purchasePriceIdx + ", MRP=" + mrpIdx);
            
            int rowNum = 1;
            while (rows.hasNext()) {
                rowNum++;
                Row row = rows.next();
                String itemName = "";
                
                try {
                    // Check if row is empty or essential columns are missing
                    itemName = getCellValueAsString(row.getCell(itemNameIdx), dataFormatter).trim();
                    if (itemName.isEmpty()) {
                        System.out.println("Row " + rowNum + ": Skipped (Empty Item Name)");
                        continue;
                    }
                    
                    String sizeName = getCellValueAsString(row.getCell(sizeNameIdx), dataFormatter).trim();
                    Double purchasePrice = getCellValueAsDoubleStrict(row.getCell(purchasePriceIdx), dataFormatter);
                    Double mrp = getCellValueAsDoubleStrict(row.getCell(mrpIdx), dataFormatter);

                    System.out.println("Row " + rowNum + ": Processing Item='" + itemName + "', Size='" + sizeName + "', PP=" + purchasePrice + ", MRP=" + mrp);

                    // Find Item
                    Optional<Item> itemOpt = itemRepository.findByItemNameIgnoreCase(itemName);
                    if (itemOpt.isEmpty()) {
                        throw new Exception("Item '" + itemName + "' not found in DB");
                    }
                    Item item = itemOpt.get();

                    // Find Size
                    Optional<Size> sizeOpt = sizeRepository.findByNameIgnoreCase(sizeName);
                    if (sizeOpt.isEmpty()) {
                        throw new Exception("Size '" + sizeName + "' not found in DB");
                    }
                    Size size = sizeOpt.get();
                    
                    PriceMaster price = new PriceMaster();
                    price.setItemCode(item.getItemCode());
                    price.setItemName(item.getItemName());
                    price.setSizeCode(size.getCode());
                    price.setSizeName(size.getName());
                    
                    price.setPurchasePrice(purchasePrice);
                    price.setMrp(mrp);
                    
                    // Save individually to isolate errors
                    savePrice(price);
                    savedCount++;

                } catch (Exception e) {
                    String itemStr = itemName.isEmpty() ? "Unknown Item" : itemName;
                    String error = "Row " + rowNum + " (" + itemStr + "): " + e.getMessage();
                    errors.add(error);
                    System.out.println(error);
                }
            }
        }
        
        result.put("savedCount", savedCount);
        result.put("errors", errors);
        return result;
    }

    public java.io.ByteArrayInputStream exportPricesToExcel() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Prices");
            
            // Header
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Item Name", "Size Name", "Purchase Price", "MRP"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                CellStyle style = workbook.createCellStyle();
                Font font = workbook.createFont();
                font.setBold(true);
                style.setFont(font);
                cell.setCellStyle(style);
            }
            
            // Data
            List<PriceMaster> prices = priceMasterRepository.findAll();
            int rowNum = 1;
            for (PriceMaster price : prices) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(price.getItemName() != null ? price.getItemName() : "");
                row.createCell(1).setCellValue(price.getSizeName() != null ? price.getSizeName() : "");
                
                Cell ppCell = row.createCell(2);
                if (price.getPurchasePrice() != null) ppCell.setCellValue(price.getPurchasePrice());
                
                Cell mrpCell = row.createCell(3);
                if (price.getMrp() != null) mrpCell.setCellValue(price.getMrp());
            }
            
            // Autosize columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return new java.io.ByteArrayInputStream(out.toByteArray());
        }
    }
    
    private String getCellValueAsString(Cell cell, DataFormatter dataFormatter) {
        if (cell == null) return "";
        return dataFormatter.formatCellValue(cell);
    }
    
    private Double getCellValueAsDoubleStrict(Cell cell, DataFormatter dataFormatter) throws Exception {
        if (cell == null) return null;
        String val = dataFormatter.formatCellValue(cell).trim();
        if (val.isEmpty()) return null;
        
        String original = val;
        // Remove currency symbols, commas, etc.
        val = val.replaceAll("[^0-9.]", "");
        
        if (val.isEmpty() && !original.isEmpty()) {
            throw new Exception("Invalid number format: '" + original + "'");
        }
        
        try {
            return val.isEmpty() ? null : Double.parseDouble(val);
        } catch (NumberFormatException e) {
            throw new Exception("Invalid number format: '" + original + "'");
        }
    }
}
