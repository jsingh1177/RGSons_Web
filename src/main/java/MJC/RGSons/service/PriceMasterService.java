package MJC.RGSons.service;

import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Size;
import MJC.RGSons.repository.PriceMasterRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.SizeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.stream.Collectors;

@Service
public class PriceMasterService {

    private static final Logger logger = LoggerFactory.getLogger(PriceMasterService.class);

    @Autowired
    private PriceMasterRepository priceMasterRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SizeRepository sizeRepository;

    private void populateNamesFromMasters(List<PriceMaster> prices) {
        if (prices == null || prices.isEmpty()) return;

        Map<String, String> itemNameByCode = itemRepository.findAll().stream()
                .filter(i -> i.getItemCode() != null)
                .collect(Collectors.toMap(
                        i -> i.getItemCode().trim(),
                        i -> i.getItemName() != null ? i.getItemName().trim() : "",
                        (a, b) -> a
                ));

        Map<String, String> sizeNameByCode = sizeRepository.findAll().stream()
                .filter(s -> s.getCode() != null)
                .collect(Collectors.toMap(
                        s -> s.getCode().trim(),
                        s -> s.getName() != null ? s.getName().trim() : "",
                        (a, b) -> a
                ));

        for (PriceMaster p : prices) {
            if (p == null) continue;
            String itemCode = p.getItemCode() != null ? p.getItemCode().trim() : null;
            String sizeCode = p.getSizeCode() != null ? p.getSizeCode().trim() : null;
            if (itemCode != null && !itemCode.isBlank()) {
                String name = itemNameByCode.get(itemCode);
                if (name != null && !name.isBlank()) {
                    p.setItemName(name);
                }
            }
            if (sizeCode != null && !sizeCode.isBlank()) {
                String name = sizeNameByCode.get(sizeCode);
                if (name != null && !name.isBlank()) {
                    p.setSizeName(name);
                }
            }
        }
    }

    public List<PriceMaster> getPricesByItemCode(String itemCode) {
        List<PriceMaster> prices = priceMasterRepository.findByItemCode(itemCode);
        populateNamesFromMasters(prices);
        return prices;
    }

    public List<PriceMaster> getAllPrices() {
        return priceMasterRepository.findAll();
    }

    public Page<PriceMaster> getAllPrices(Pageable pageable, String search) {
        if (search != null && !search.trim().isEmpty()) {
            Page<PriceMaster> page = priceMasterRepository.findByItemNameContainingIgnoreCaseOrItemCodeContainingIgnoreCase(search.trim(), search.trim(), pageable);
            populateNamesFromMasters(page.getContent());
            return page;
        }
        Page<PriceMaster> page = priceMasterRepository.findAll(pageable);
        populateNamesFromMasters(page.getContent());
        return page;
    }

    @Transactional
    public void savePrice(PriceMaster price) {
        Optional<PriceMaster> existingPrice = priceMasterRepository.findByItemCodeAndSizeCode(price.getItemCode(), price.getSizeCode());
        if (existingPrice.isPresent()) {
            PriceMaster update = existingPrice.get();
            if (price.getPurchasePrice() != null) update.setPurchasePrice(price.getPurchasePrice());
            if (price.getSalePrice() != null) update.setSalePrice(price.getSalePrice());
            if (price.getMrp() != null) update.setMrp(price.getMrp());
            if (price.getItemName() != null && !price.getItemName().isEmpty()) update.setItemName(price.getItemName());
            if (price.getSizeName() != null && !price.getSizeName().isEmpty()) update.setSizeName(price.getSizeName());
            if (price.getUom() != null && !price.getUom().trim().isEmpty()) update.setUom(price.getUom().trim());
            
            priceMasterRepository.save(update);
        } else {
            if (price.getUom() == null || price.getUom().trim().isEmpty()) {
                price.setUom("PCS");
            } else {
                price.setUom(price.getUom().trim());
            }
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

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter dataFormatter = new DataFormatter();
            
            Iterator<Row> rows = sheet.iterator();
            
            // Map columns
            int itemNameIdx = -1;
            int sizeNameIdx = -1;
            int purchasePriceIdx = -1;
            int salePriceIdx = -1;
            int mrpIdx = -1;
            int uomIdx = -1;
            
            if (rows.hasNext()) {
                Row headerRow = rows.next();
                for (Cell cell : headerRow) {
                    String header = dataFormatter.formatCellValue(cell).trim().toLowerCase();
                    
                    if (header.contains("item") && (header.contains("name") || header.contains("desc"))) itemNameIdx = cell.getColumnIndex();
                    else if (header.contains("size") || header.contains("packing") || header.contains("qty")) sizeNameIdx = cell.getColumnIndex();
                    else if (header.contains("purchase") || header.contains("rate") || header.contains("cost") || header.contains("buy")) purchasePriceIdx = cell.getColumnIndex();
                    else if (header.contains("sale") && header.contains("price")) salePriceIdx = cell.getColumnIndex();
                    else if (header.contains("mrp") || header.contains("sell") || header.contains("sp")) mrpIdx = cell.getColumnIndex();
                    else if (header.equals("uom") || header.contains("base unit")) uomIdx = cell.getColumnIndex();
                }
            }
            
            // Fallback to default indices if headers not found (or no headers)
            if (itemNameIdx == -1) itemNameIdx = 0;
            if (sizeNameIdx == -1) sizeNameIdx = 1;
            if (purchasePriceIdx == -1) purchasePriceIdx = 2;
            if (salePriceIdx == -1) salePriceIdx = 3;
            if (mrpIdx == -1) mrpIdx = 4;
            logger.debug("Mapped import columns item={}, size={}, purchase={}, sale={}, mrp={}, uom={}",
                    itemNameIdx, sizeNameIdx, purchasePriceIdx, salePriceIdx, mrpIdx, uomIdx);
            
            int rowNum = 1;
            while (rows.hasNext()) {
                rowNum++;
                Row row = rows.next();
                String itemName = "";
                
                try {
                    // Check if row is empty or essential columns are missing
                    itemName = getCellValueAsString(row.getCell(itemNameIdx), dataFormatter).trim();
                    if (itemName.isEmpty()) {
                        logger.debug("Skipping price import row {} because item name is empty", rowNum);
                        continue;
                    }
                    
                    String sizeName = getCellValueAsString(row.getCell(sizeNameIdx), dataFormatter).trim();
                    Double purchasePrice = getCellValueAsDoubleStrict(row.getCell(purchasePriceIdx), dataFormatter);
                    Double salePrice = getCellValueAsDoubleStrict(row.getCell(salePriceIdx), dataFormatter);
                    Double mrp = getCellValueAsDoubleStrict(row.getCell(mrpIdx), dataFormatter);
                    String uom = uomIdx >= 0 ? getCellValueAsString(row.getCell(uomIdx), dataFormatter).trim() : "";

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
                    price.setSalePrice(salePrice);
                    price.setMrp(mrp);
                    price.setUom(uom == null || uom.isBlank() ? "PCS" : uom);
                    
                    // Save individually to isolate errors
                    savePrice(price);
                    savedCount++;

                } catch (Exception e) {
                    String itemStr = itemName.isEmpty() ? "Unknown Item" : itemName;
                    String error = "Row " + rowNum + " (" + itemStr + "): " + e.getMessage();
                    errors.add(error);
                    logger.warn("{}", error);
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
            String[] columns = {"Item Name", "Size Name", "Purchase Price", "Sale Price", "MRP", "Base Unit"};
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
            populateNamesFromMasters(prices);
            int rowNum = 1;
            for (PriceMaster price : prices) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(price.getItemName() != null ? price.getItemName() : "");
                row.createCell(1).setCellValue(price.getSizeName() != null ? price.getSizeName() : "");
                
                Cell ppCell = row.createCell(2);
                if (price.getPurchasePrice() != null) ppCell.setCellValue(price.getPurchasePrice());
                
                Cell spCell = row.createCell(3);
                if (price.getSalePrice() != null) spCell.setCellValue(price.getSalePrice());
                
                Cell mrpCell = row.createCell(4);
                if (price.getMrp() != null) mrpCell.setCellValue(price.getMrp());

                row.createCell(5).setCellValue(price.getUom() != null ? price.getUom() : "");
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
