package MJC.RGSons.service;

import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Size;
import MJC.RGSons.model.Store;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.SizeRepository;
import MJC.RGSons.repository.StoreRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class InventoryService {

    @Autowired
    private InventoryMasterRepository inventoryMasterRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SizeRepository sizeRepository;

    public List<InventoryMaster> getAllInventory() {
        return inventoryMasterRepository.findAll();
    }

    public List<InventoryMaster> getInventoryByItemCode(String itemCode) {
        return inventoryMasterRepository.findByItemCode(itemCode);
    }

    public Integer getClosingStock(String storeCode, String itemCode, String sizeCode) {
        Optional<InventoryMaster> inv = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(storeCode, itemCode, sizeCode);
        if (inv.isEmpty() && "HO".equals(storeCode)) {
            inv = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode("Head Office", itemCode, sizeCode);
        }
        return inv.map(InventoryMaster::getClosing).orElse(0);
    }

    public Map<String, Integer> getClosingStockByItem(String storeCode, String itemCode) {
        List<InventoryMaster> inventoryList = inventoryMasterRepository.findByStoreCodeAndItemCode(storeCode, itemCode);
        
        if (inventoryList.isEmpty() && "HO".equals(storeCode)) {
            inventoryList = inventoryMasterRepository.findByStoreCodeAndItemCode("Head Office", itemCode);
        }

        Map<String, Integer> stockMap = new HashMap<>();
        for (InventoryMaster inv : inventoryList) {
            stockMap.put(inv.getSizeCode(), inv.getClosing() != null ? inv.getClosing() : 0);
        }
        return stockMap;
    }

    public List<Map<String, String>> searchAvailableItems(String storeCode, String query) {
        List<Object[]> results = inventoryMasterRepository.searchAvailableItems(storeCode, query);
        List<Map<String, String>> items = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, String> item = new HashMap<>();
            item.put("itemCode", (String) row[0]);
            item.put("itemName", (String) row[1]);
            items.add(item);
        }
        return items;
    }

    @Transactional
    public void updateInventoryFromPurchase(List<MJC.RGSons.model.PurItem> purItems) {
        for (MJC.RGSons.model.PurItem item : purItems) {
            String storeCode = item.getStoreCode();
            if (storeCode == null || storeCode.isEmpty()) {
                // If item doesn't have store code, try to find it or skip? 
                // Usually store code is on the item in our implementation
                continue; 
            }

            Optional<InventoryMaster> existingInv = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                    storeCode, item.getItemCode(), item.getSizeCode());

            if (existingInv.isPresent()) {
                InventoryMaster inv = existingInv.get();
                // Update Purchase and Closing
                int currentPurchase = inv.getPurchase() != null ? inv.getPurchase() : 0;
                int currentClosing = inv.getClosing() != null ? inv.getClosing() : 0;
                int qty = item.getQuantity() != null ? item.getQuantity() : 0;

                inv.setPurchase(currentPurchase + qty);
                // Recalculate Closing: Closing = Opening + Purchase + Inward - Outward
                int opening = inv.getOpening() != null ? inv.getOpening() : 0;
                int inward = inv.getInward() != null ? inv.getInward() : 0;
                int outward = inv.getOutward() != null ? inv.getOutward() : 0;
                inv.setClosing(opening + inv.getPurchase() + inward - outward);
                inv.setBusinessDate(item.getInvoiceDate()); // Update date to latest transaction
                
                inventoryMasterRepository.save(inv);
            } else {
                // Create new Inventory Record
                InventoryMaster newInv = new InventoryMaster();
                newInv.setStoreCode(storeCode);
                newInv.setItemCode(item.getItemCode());
                newInv.setSizeCode(item.getSizeCode());
                newInv.setBusinessDate(item.getInvoiceDate());
                
                // Fetch Names
                Optional<Item> itemOpt = itemRepository.findByItemCode(item.getItemCode());
                if (itemOpt.isPresent()) {
                    newInv.setItemName(itemOpt.get().getItemName());
                } else {
                    newInv.setItemName(""); 
                }

                Optional<Size> sizeOpt = sizeRepository.findByCode(item.getSizeCode());
                if (sizeOpt.isPresent()) {
                    newInv.setSizeName(sizeOpt.get().getName());
                } else {
                    newInv.setSizeName("");
                }

                newInv.setOpening(0);
                int qty = item.getQuantity() != null ? item.getQuantity() : 0;
                newInv.setPurchase(qty);
                newInv.setInward(0);
                newInv.setOutward(0);
                newInv.setClosing(qty);

                inventoryMasterRepository.save(newInv);
            }
        }
    }

    @Transactional
    public List<InventoryMaster> saveInventory(List<InventoryMaster> inventoryList) {
        for (InventoryMaster inv : inventoryList) {
            // Default store code if not present (assuming single store or default store for now)
            // In a multi-store environment, storeCode should be passed from frontend or context
            String storeCode = inv.getStoreCode();
            
            if (storeCode == null || storeCode.isEmpty()) {
                storeCode = "STORE001"; // Default or handle appropriately
                inv.setStoreCode(storeCode);
            }

            Optional<InventoryMaster> existingInv = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                    storeCode, inv.getItemCode(), inv.getSizeCode());

            if (existingInv.isPresent()) {
                InventoryMaster update = existingInv.get();
                // Update Opening stock
                if (inv.getBusinessDate() != null) {
                    update.setBusinessDate(inv.getBusinessDate());
                }

                if (inv.getOpening() != null) {
                    int oldOpening = update.getOpening() != null ? update.getOpening() : 0;
                    int oldClosing = update.getClosing() != null ? update.getClosing() : 0;
                    int newOpening = inv.getOpening();
                    
                    update.setOpening(newOpening);
                    // Recalculate Closing based on delta: Closing - Previous Opening + new Opening
                    update.setClosing(oldClosing - oldOpening + newOpening);
                }
                
                inventoryMasterRepository.save(update);
            } else {
                // New record
                if (inv.getPurchase() == null) inv.setPurchase(0);
                if (inv.getInward() == null) inv.setInward(0);
                if (inv.getOutward() == null) inv.setOutward(0);
                
                int opening = inv.getOpening() != null ? inv.getOpening() : 0;
                inv.setClosing(opening + inv.getPurchase() + inv.getInward() - inv.getOutward());
                
                inventoryMasterRepository.save(inv);
            }
        }
        return inventoryList;
    }

    public ByteArrayInputStream exportInventoryToExcel(String storeCode) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Opening Inventory");
            
            // Header
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Store Name", "Date", "Item Name", "Size Name", "Opening Qty"};
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
            List<InventoryMaster> inventoryList;
            if (storeCode != null && !storeCode.isEmpty() && !storeCode.equalsIgnoreCase("null")) {
                inventoryList = inventoryMasterRepository.findByStoreCodeWithLegacyFallback(storeCode);
            } else {
                inventoryList = inventoryMasterRepository.findAll();
            }
            
            // We need to fetch Store Name, but InventoryMaster only has StoreCode.
            // Optimization: Fetch all stores and map Code -> Name
            List<Store> stores = storeRepository.findAll();
            Map<String, String> storeMap = new HashMap<>();
            for(Store s : stores) {
                storeMap.put(s.getStoreCode(), s.getStoreName());
            }

            int rowNum = 1;
            for (InventoryMaster inv : inventoryList) {
                Row row = sheet.createRow(rowNum++);
                
                String locationName = storeMap.getOrDefault(inv.getStoreCode(), inv.getStoreCode());
                row.createCell(0).setCellValue(locationName != null ? locationName : "");
                row.createCell(1).setCellValue(inv.getBusinessDate() != null ? inv.getBusinessDate() : "");
                row.createCell(2).setCellValue(inv.getItemName() != null ? inv.getItemName() : "");
                row.createCell(3).setCellValue(inv.getSizeName() != null ? inv.getSizeName() : "");
                
                Cell openingCell = row.createCell(4);
                if (inv.getOpening() != null) openingCell.setCellValue(inv.getOpening());
                else openingCell.setCellValue(0);
            }
            
            // Autosize columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    @Transactional
    public Map<String, Object> importInventoryFromExcel(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int savedCount = 0;

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter dataFormatter = new DataFormatter();
            
            Iterator<Row> rows = sheet.iterator();
            
            // Map columns
            int locationIdx = -1;
            int dateIdx = -1;
            int itemNameIdx = -1;
            int sizeNameIdx = -1;
            int openingQtyIdx = -1;
            
            if (rows.hasNext()) {
                Row headerRow = rows.next();
                for (Cell cell : headerRow) {
                    String header = dataFormatter.formatCellValue(cell).trim().toLowerCase();
                    
                    if (header.contains("location") || header.contains("store")) locationIdx = cell.getColumnIndex();
                    else if (header.contains("date")) dateIdx = cell.getColumnIndex();
                    else if (header.contains("item") && (header.contains("name") || header.contains("desc"))) itemNameIdx = cell.getColumnIndex();
                    else if (header.contains("size")) sizeNameIdx = cell.getColumnIndex();
                    else if (header.contains("opening") || header.contains("qty") || header.contains("stock")) openingQtyIdx = cell.getColumnIndex();
                }
            }
            
            // Fallback
            if (locationIdx == -1) locationIdx = 0;
            if (dateIdx == -1) dateIdx = 1;
            if (itemNameIdx == -1) itemNameIdx = 2;
            if (sizeNameIdx == -1) sizeNameIdx = 3;
            if (openingQtyIdx == -1) openingQtyIdx = 4;
            
            int rowNum = 1;
            while (rows.hasNext()) {
                rowNum++;
                Row row = rows.next();
                String itemName = "";
                
                try {
                    itemName = getCellValueAsString(row.getCell(itemNameIdx), dataFormatter).trim();
                    if (itemName.isEmpty()) continue;
                    
                    String locationName = getCellValueAsString(row.getCell(locationIdx), dataFormatter).trim();
                    String dateStr = getCellValueAsDateStr(row.getCell(dateIdx), dataFormatter);
                    String sizeName = getCellValueAsString(row.getCell(sizeNameIdx), dataFormatter).trim();
                    Double openingQtyDouble = getCellValueAsDoubleStrict(row.getCell(openingQtyIdx), dataFormatter);
                    int openingQty = openingQtyDouble != null ? openingQtyDouble.intValue() : 0;

                    // Resolve Store/Location
                    String storeCodeToUse = null;

                    // 1. Try finding by Name (Case Insensitive)
                    Optional<Store> storeByName = storeRepository.findByStoreNameIgnoreCase(locationName);
                    if (storeByName.isPresent()) {
                        storeCodeToUse = storeByName.get().getStoreCode();
                    } else {
                        // 2. Try finding by Code (as fallback if name not found)
                        Optional<Store> storeByCode = storeRepository.findByStoreCode(locationName);
                        if (storeByCode.isPresent()) {
                            storeCodeToUse = storeByCode.get().getStoreCode();
                        }
                    }

                    if (storeCodeToUse == null) {
                        // Legacy fallback for Head Office if not in DB, but prefer DB
                        if (locationName.equalsIgnoreCase("Head Office") || locationName.equalsIgnoreCase("HO")) {
                            // Use "HO" as the standard code for Head Office if not found in DB
                            storeCodeToUse = "HO"; 
                        } else {
                            throw new Exception("Location '" + locationName + "' not found in Store table");
                        }
                    }
                    
                    // Resolve Item
                    Optional<Item> itemOpt = itemRepository.findByItemNameIgnoreCase(itemName);
                    if (itemOpt.isEmpty()) {
                        throw new Exception("Item '" + itemName + "' not found");
                    }
                    Item item = itemOpt.get();
                    
                    // Resolve Size
                    Optional<Size> sizeOpt = sizeRepository.findByNameIgnoreCase(sizeName);
                    if (sizeOpt.isEmpty()) {
                        throw new Exception("Size '" + sizeName + "' not found");
                    }
                    Size size = sizeOpt.get();
                    
                    // Prepare InventoryMaster object
                    InventoryMaster inv = new InventoryMaster();
                    inv.setStoreCode(storeCodeToUse);
                    inv.setItemCode(item.getItemCode());
                    inv.setItemName(item.getItemName());
                    inv.setSizeCode(size.getCode());
                    inv.setSizeName(size.getName());
                    inv.setOpening(openingQty);
                    inv.setBusinessDate(dateStr); // Ensure date format matches system expectation (usually YYYY-MM-DD)
                    
                    // Use existing saveInventory logic which handles updates and closing calculation
                    saveInventory(Collections.singletonList(inv));
                    savedCount++;
                    
                } catch (Exception e) {
                    errors.add("Row " + rowNum + ": " + e.getMessage());
                }
            }
        }
        
        result.put("savedCount", savedCount);
        result.put("errors", errors);
        return result;
    }

    private String getCellValueAsString(Cell cell, DataFormatter dataFormatter) {
        if (cell == null) return "";
        return dataFormatter.formatCellValue(cell);
    }
    
    private String getCellValueAsDateStr(Cell cell, DataFormatter dataFormatter) {
        if (cell == null) return "";
        
        try {
            // 1. Try numeric date (Excel Date)
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                LocalDateTime date = cell.getLocalDateTimeCellValue();
                return date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            }
        } catch (Exception e) {
            // Fallback
        }

        // 2. String Parsing
        String val = dataFormatter.formatCellValue(cell).trim();
        if (val.isEmpty()) return "";
        
        // Already yyyy-MM-dd?
        if (val.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            return val;
        }
        
        // dd-MM-yyyy or dd/MM/yyyy
        if (val.matches("^\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}$")) {
             try {
                 String[] parts = val.split("[-/]");
                 int d = Integer.parseInt(parts[0]);
                 int m = Integer.parseInt(parts[1]);
                 int y = Integer.parseInt(parts[2]);
                 return String.format("%04d-%02d-%02d", y, m, d);
             } catch (Exception e) {
                 // ignore
             }
        }
        
        // Try parsing flexible formats
        try {
             DateTimeFormatter[] formatters = {
                DateTimeFormatter.ofPattern("d-MMM-yyyy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("d-MMM-yy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("dd-MMM-yy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("d/M/yyyy"),
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.ofPattern("d-M-yyyy"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd")
            };
            
            for (DateTimeFormatter fmt : formatters) {
                try {
                    LocalDate d = LocalDate.parse(val, fmt);
                    return d.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                } catch (Exception e) {
                    // continue
                }
            }
        } catch (Exception e) {
            // ignore
        }

        return val;
    }
    
    private Double getCellValueAsDoubleStrict(Cell cell, DataFormatter dataFormatter) throws Exception {
        if (cell == null) return null;
        String val = dataFormatter.formatCellValue(cell).trim();
        if (val.isEmpty()) return null;
        
        String original = val;
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
