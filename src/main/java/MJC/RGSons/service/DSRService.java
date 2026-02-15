package MJC.RGSons.service;

import MJC.RGSons.dto.DSRSaveRequest;
import MJC.RGSons.model.DSR;
import MJC.RGSons.model.DSRHead;
import MJC.RGSons.model.InventoryMaster;
import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.model.StiItem;
import MJC.RGSons.model.StoItem;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.model.TranLedger;
import MJC.RGSons.model.Category;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Brand;
import MJC.RGSons.model.Size;
import MJC.RGSons.model.Ledger;
import MJC.RGSons.repository.DSRHeadRepository;
import MJC.RGSons.repository.DSRRepository;
import MJC.RGSons.repository.InventoryMasterRepository;
import MJC.RGSons.repository.PriceMasterRepository;
import MJC.RGSons.repository.StiItemRepository;
import MJC.RGSons.repository.StoItemRepository;
import MJC.RGSons.repository.TranItemRepository;
import MJC.RGSons.repository.TranLedgerRepository;
import MJC.RGSons.repository.CategoryRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.BrandRepository;
import MJC.RGSons.repository.SizeRepository;
import MJC.RGSons.repository.LedgerRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DSRService {

    @Autowired
    private DSRRepository dsrRepository;

    @Autowired
    private DSRHeadRepository dsrHeadRepository;

    @Autowired
    private InventoryMasterRepository inventoryMasterRepository;

    @Autowired
    private PriceMasterRepository priceMasterRepository;

    @Autowired
    private StiItemRepository stiItemRepository;

    @Autowired
    private StoItemRepository stoItemRepository;

    @Autowired
    private TranItemRepository tranItemRepository;

    @Autowired
    private TranLedgerRepository tranLedgerRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private SizeRepository sizeRepository;

    @Autowired
    private LedgerRepository ledgerRepository;

    public String getDSRStatus(String storeCode, String date) {
        Optional<DSRHead> headOpt = dsrHeadRepository.findByStoreCodeAndDsrDate(storeCode, date);
        if (headOpt.isPresent()) {
            return headOpt.get().getDsrStatus();
        }
        return "PENDING";
    }

    @Transactional
    public void saveDSR(DSRSaveRequest request) {
        System.out.println("Saving DSR with request: " + request);
        if (request != null) {
            System.out.println("StoreCode: " + request.getStoreCode());
            System.out.println("DsrDate: " + request.getDsrDate());
        }

        if (dsrHeadRepository == null) {
            throw new IllegalStateException("dsrHeadRepository is null");
        }
        if (request == null) {
            throw new IllegalArgumentException("Request body is null");
        }
        if (request.getStoreCode() == null || request.getStoreCode().isEmpty()) {
            throw new IllegalArgumentException("Store Code is required");
        }
        if (request.getDsrDate() == null || request.getDsrDate().isEmpty()) {
            throw new IllegalArgumentException("DSR Date is required");
        }

        // 1. Save or Update DSR Head
        Optional<DSRHead> headOpt = dsrHeadRepository.findByStoreCodeAndDsrDate(request.getStoreCode(), request.getDsrDate());
        DSRHead head;
        if (headOpt.isPresent()) {
            head = headOpt.get();
            head.setUpdatedAt(LocalDateTime.now());
        } else {
            head = new DSRHead();
            head.setStoreCode(request.getStoreCode());
            head.setDsrDate(request.getDsrDate());
            head.setCreatedAt(LocalDateTime.now());
            head.setUpdatedAt(LocalDateTime.now());
        }
        head.setUserName(request.getUserName());
        head.setDsrStatus("SUBMITTED");
        dsrHeadRepository.save(head);

        // 2. Update DSR Details
        if (request.getDetails() != null) {
            for (DSRSaveRequest.DSRDetailRequest detailReq : request.getDetails()) {
                Optional<DSR> dsrOpt = Optional.empty();
                
                if (detailReq.getId() != null) {
                    dsrOpt = dsrRepository.findById(detailReq.getId());
                } else if (detailReq.getItemCode() != null && detailReq.getSizeCode() != null) {
                    dsrOpt = dsrRepository.findByStoreAndBusinessDateAndItemCodeAndSizeCode(
                            request.getStoreCode(), request.getDsrDate(), detailReq.getItemCode(), detailReq.getSizeCode());
                }

                if (dsrOpt.isPresent()) {
                    DSR dsr = dsrOpt.get();
                    
                    // Update fields
                    if (detailReq.getInward() != null) dsr.setInward(detailReq.getInward());
                    if (detailReq.getOutward() != null) dsr.setOutward(detailReq.getOutward());
                    if (detailReq.getSale() != null) dsr.setSale(detailReq.getSale());
                    
                    // Recalculate Closing
                    // Closing = Opening + Inward - Outward - Sale
                    int opening = dsr.getOpening() != null ? dsr.getOpening() : 0;
                    int inward = dsr.getInward() != null ? dsr.getInward() : 0;
                    int outward = dsr.getOutward() != null ? dsr.getOutward() : 0;
                    int sale = dsr.getSale() != null ? dsr.getSale() : 0;
                    
                    dsr.setClosing(opening + inward - outward - sale);
                    dsr.setUpdatedAt(LocalDateTime.now());
                    
                    dsrRepository.save(dsr);
                } else if (detailReq.getItemCode() != null && detailReq.getSizeCode() != null) {
                    // Record not found, insert new record
                    Optional<InventoryMaster> invOpt = inventoryMasterRepository.findByStoreCodeAndItemCodeAndSizeCode(
                            request.getStoreCode(), detailReq.getItemCode(), detailReq.getSizeCode());
                    
                    if (invOpt.isPresent()) {
                        InventoryMaster inventory = invOpt.get();
                        DSR dsr = new DSR();
                        dsr.setStore(request.getStoreCode());
                        dsr.setBusinessDate(request.getDsrDate());
                        dsr.setItemCode(inventory.getItemCode());
                        dsr.setItemName(inventory.getItemName());
                        dsr.setSizeCode(inventory.getSizeCode());
                        dsr.setSizeName(inventory.getSizeName());
                        
                        // Closing from Inventory becomes Opening in DSR
                        dsr.setOpening(inventory.getClosing()); 
                        
                        // Initialize with request values or 0
                        dsr.setInward(detailReq.getInward() != null ? detailReq.getInward() : 0);
                        dsr.setOutward(detailReq.getOutward() != null ? detailReq.getOutward() : 0);
                        dsr.setSale(detailReq.getSale() != null ? detailReq.getSale() : 0);
                        
                        // Calculate Closing
                        dsr.setClosing(dsr.getOpening() + dsr.getInward() - dsr.getOutward() - dsr.getSale());

                        // Fetch Price details
                        Optional<PriceMaster> priceOpt = priceMasterRepository.findByItemCodeAndSizeCode(inventory.getItemCode(), inventory.getSizeCode());
                        if (priceOpt.isPresent()) {
                            PriceMaster price = priceOpt.get();
                            dsr.setPurchasePrice(price.getPurchasePrice());
                            dsr.setMrp(price.getMrp());
                        } else {
                            dsr.setPurchasePrice(0.0);
                            dsr.setMrp(0.0);
                        }

                        dsr.setCreatedAt(LocalDateTime.now());
                        dsr.setUpdatedAt(LocalDateTime.now());

                        dsrRepository.save(dsr);
                    }
                }
            }
        }
    }

    public ByteArrayInputStream exportDSRToExcel(String storeCode, String businessDate) throws IOException {
        List<DSR> dsrList = dsrRepository.findByStoreAndBusinessDate(storeCode, businessDate);
        List<TranItem> tranItems = tranItemRepository.findByStoreCodeAndInvoiceDate(storeCode, businessDate);
        List<TranLedger> tranLedgers = tranLedgerRepository.findByStoreCodeAndInvoiceDate(storeCode, businessDate);

        List<Size> activeSizes = sizeRepository.findByStatusOrderByNameAsc(true);
        List<Brand> activeBrands = brandRepository.findActiveBrands();
        List<Item> allItems = itemRepository.findAll().stream()
                .filter(i -> Boolean.TRUE.equals(i.getStatus()))
                .collect(Collectors.toList());

        Map<String, Category> categoryMap = categoryRepository.findActiveCategories().stream()
                .collect(Collectors.toMap(Category::getCode, c -> c));

        Map<String, Item> itemByCode = allItems.stream()
                .collect(Collectors.toMap(Item::getItemCode, i -> i, (a, b) -> a));

        Map<String, List<Item>> itemsByBrand = new HashMap<>();
        for (Item item : allItems) {
            String brandCode = item.getBrandCode();
            if (brandCode == null) continue;
            itemsByBrand.computeIfAbsent(brandCode, k -> new java.util.ArrayList<>()).add(item);
        }

        activeBrands.sort((a, b) -> {
            String n1 = a.getName() != null ? a.getName() : "";
            String n2 = b.getName() != null ? b.getName() : "";
            return n1.compareToIgnoreCase(n2);
        });

        activeSizes.sort((a, b) -> {
            Integer o1 = a.getShortOrder();
            Integer o2 = b.getShortOrder();
            int orderA = (o1 != null && o1 > 0) ? o1 : Integer.MAX_VALUE;
            int orderB = (o2 != null && o2 > 0) ? o2 : Integer.MAX_VALUE;
            if (orderA != orderB) {
                return Integer.compare(orderA, orderB);
            }
            String n1 = a.getName() != null ? a.getName() : "";
            String n2 = b.getName() != null ? b.getName() : "";
            return n1.compareToIgnoreCase(n2);
        });

        Map<String, Map<String, DSR>> dsrMap = new HashMap<>();
        for (DSR dsr : dsrList) {
            if (dsr.getItemCode() == null || dsr.getSizeCode() == null) continue;
            dsrMap.computeIfAbsent(dsr.getItemCode(), k -> new HashMap<>())
                    .put(dsr.getSizeCode(), dsr);
        }

        class SaleAgg {
            int qty;
            double amount;
        }

        Map<String, Map<String, SaleAgg>> salesMap = new HashMap<>();
        for (TranItem ti : tranItems) {
            if (ti.getItemCode() == null || ti.getSizeCode() == null) continue;
            Map<String, SaleAgg> bySize = salesMap.computeIfAbsent(ti.getItemCode(), k -> new HashMap<>());
            SaleAgg agg = bySize.computeIfAbsent(ti.getSizeCode(), k -> new SaleAgg());
            if (ti.getQuantity() != null) {
                agg.qty += ti.getQuantity();
            }
            if (ti.getAmount() != null) {
                agg.amount += ti.getAmount();
            }
        }

        Map<String, Category> categoryByCode = categoryRepository.findActiveCategories().stream()
                .collect(Collectors.toMap(Category::getCode, c -> c));

        Map<String, Double> categoryTotals = new LinkedHashMap<>();
        double totalSaleAmount = 0.0;

        for (Item item : allItems) {
            String itemCode = item.getItemCode();
            Map<String, SaleAgg> itemSales = salesMap.get(itemCode);
            if (itemSales == null || itemSales.isEmpty()) continue;

            double itemAmt = 0.0;
            for (SaleAgg agg : itemSales.values()) {
                itemAmt += agg.amount;
            }
            if (itemAmt != 0.0) {
                String catCode = item.getCategoryCode();
                String catName = "Unknown Category";
                if (catCode != null && categoryByCode.containsKey(catCode)) {
                    catName = categoryByCode.get(catCode).getName();
                }
                categoryTotals.put(catName, categoryTotals.getOrDefault(catName, 0.0) + itemAmt);
                totalSaleAmount += itemAmt;
            }
        }

        List<Ledger> saleLedgers = ledgerRepository.findByTypeAndScreenAndStatus("Sale", "Sale", 1);
        List<Ledger> expenseLedgers = ledgerRepository.findByTypeAndScreenAndStatus("Expense", "Sale", 1);
        List<Ledger> tenderLedgers = ledgerRepository.findByTypeAndScreenAndStatus("Tender", "Sale", 1);

        saleLedgers.sort((a, b) -> {
            Integer o1 = a.getShortOrder();
            Integer o2 = b.getShortOrder();
            int orderA = (o1 != null && o1 > 0) ? o1 : Integer.MAX_VALUE;
            int orderB = (o2 != null && o2 > 0) ? o2 : Integer.MAX_VALUE;
            if (orderA != orderB) {
                return Integer.compare(orderA, orderB);
            }
            String n1 = a.getName() != null ? a.getName() : "";
            String n2 = b.getName() != null ? b.getName() : "";
            return n1.compareToIgnoreCase(n2);
        });

        expenseLedgers.sort((a, b) -> {
            Integer o1 = a.getShortOrder();
            Integer o2 = b.getShortOrder();
            int orderA = (o1 != null && o1 > 0) ? o1 : Integer.MAX_VALUE;
            int orderB = (o2 != null && o2 > 0) ? o2 : Integer.MAX_VALUE;
            if (orderA != orderB) {
                return Integer.compare(orderA, orderB);
            }
            String n1 = a.getName() != null ? a.getName() : "";
            String n2 = b.getName() != null ? b.getName() : "";
            return n1.compareToIgnoreCase(n2);
        });

        tenderLedgers.sort((a, b) -> {
            Integer o1 = a.getShortOrder();
            Integer o2 = b.getShortOrder();
            int orderA = (o1 != null && o1 > 0) ? o1 : Integer.MAX_VALUE;
            int orderB = (o2 != null && o2 > 0) ? o2 : Integer.MAX_VALUE;
            if (orderA != orderB) {
                return Integer.compare(orderA, orderB);
            }
            String n1 = a.getName() != null ? a.getName() : "";
            String n2 = b.getName() != null ? b.getName() : "";
            return n1.compareToIgnoreCase(n2);
        });

        Map<String, Double> saleTotals = new LinkedHashMap<>();
        Map<String, Double> expenseTotals = new LinkedHashMap<>();
        Map<String, Double> tenderTotals = new LinkedHashMap<>();
        double totalOtherSale = 0.0;
        double totalExpense = 0.0;
        double totalTender = 0.0;

        for (TranLedger l : tranLedgers) {
            if (l.getLedgerCode() == null || l.getAmount() == null) continue;
            double amt = l.getAmount();
            if ("Expense".equalsIgnoreCase(l.getType())) {
                expenseTotals.put(l.getLedgerCode(), expenseTotals.getOrDefault(l.getLedgerCode(), 0.0) + amt);
                totalExpense += amt;
            } else if ("Tender".equalsIgnoreCase(l.getType())) {
                tenderTotals.put(l.getLedgerCode(), tenderTotals.getOrDefault(l.getLedgerCode(), 0.0) + amt);
                totalTender += amt;
            } else if ("Sale".equalsIgnoreCase(l.getType()) || "Other Sale".equalsIgnoreCase(l.getType())) {
                saleTotals.put(l.getLedgerCode(), saleTotals.getOrDefault(l.getLedgerCode(), 0.0) + amt);
                totalOtherSale += amt;
            }
        }

        Map<String, Map<String, Integer>> grandTotals = new LinkedHashMap<>();
        for (Size s : activeSizes) {
            Map<String, Integer> m = new HashMap<>();
            m.put("opening", 0);
            m.put("inward", 0);
            m.put("outward", 0);
            m.put("closing", 0);
            m.put("sale", 0);
            m.put("amount", 0);
            grandTotals.put(s.getCode(), m);
        }

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("DSR");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setBorderTop(BorderStyle.THIN);
            titleStyle.setBorderBottom(BorderStyle.THIN);
            titleStyle.setBorderLeft(BorderStyle.THIN);
            titleStyle.setBorderRight(BorderStyle.THIN);

            CellStyle footerHeaderStyle = workbook.createCellStyle();
            footerHeaderStyle.cloneStyleFrom(headerStyle);

            CellStyle footerCellStyle = workbook.createCellStyle();
            footerCellStyle.setBorderTop(BorderStyle.THIN);
            footerCellStyle.setBorderBottom(BorderStyle.THIN);
            footerCellStyle.setBorderLeft(BorderStyle.THIN);
            footerCellStyle.setBorderRight(BorderStyle.THIN);

            int rowIdx = 0;

            Row row0 = sheet.createRow(rowIdx++);
            Row row1 = sheet.createRow(rowIdx++);
            Row row2 = sheet.createRow(rowIdx++);

            int colIdx = 0;

            Cell c = row0.createCell(colIdx);
            c.setCellValue("BRAND NAME");
            c.setCellStyle(headerStyle);
            CellRangeAddress brandRegion = new CellRangeAddress(0, 2, colIdx, colIdx);
            sheet.addMergedRegion(brandRegion);
            applyRegionStyle(sheet, brandRegion, headerStyle);
            colIdx++;

            int groupCount = 7;

            String[] groupTitles = new String[] {
                    "OPENING BALANCE",
                    "RECEIVED",
                    "TRANSFER",
                    "CLOSING BALANCE",
                    "SALE",
                    "RATE",
                    "AMOUNT"
            };

            String[] groupNumbers = new String[] { "1","2","3","4","5","6","7" };

            for (int g = 0; g < groupCount; g++) {
                Cell gc = row0.createCell(colIdx);
                gc.setCellValue(groupTitles[g]);
                gc.setCellStyle(headerStyle);
                CellRangeAddress groupTitleRegion = new CellRangeAddress(0, 0, colIdx, colIdx + activeSizes.size() - 1);
                sheet.addMergedRegion(groupTitleRegion);
                applyRegionStyle(sheet, groupTitleRegion, headerStyle);

                Cell nc = row1.createCell(colIdx);
                nc.setCellValue(groupNumbers[g]);
                nc.setCellStyle(headerStyle);
                CellRangeAddress groupNumberRegion = new CellRangeAddress(1, 1, colIdx, colIdx + activeSizes.size() - 1);
                sheet.addMergedRegion(groupNumberRegion);
                applyRegionStyle(sheet, groupNumberRegion, headerStyle);

                int startCol = colIdx;
                for (Size s : activeSizes) {
                    Cell sc = row2.createCell(startCol++);
                    sc.setCellValue(s.getName());
                    sc.setCellStyle(headerStyle);
                }

                colIdx += activeSizes.size();
            }

            Cell remarksHeader = row0.createCell(colIdx);
            remarksHeader.setCellValue("REMARKS");
            remarksHeader.setCellStyle(headerStyle);
            CellRangeAddress remarksRegion = new CellRangeAddress(0, 2, colIdx, colIdx);
            sheet.addMergedRegion(remarksRegion);
            applyRegionStyle(sheet, remarksRegion, headerStyle);

            for (int i = 0; i <= colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            int lastColumnIndex = colIdx;
            sheet.shiftRows(0, sheet.getLastRowNum(), 1);
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            String titleText = "DAILY SALE STATEMENT IMFL SHOP - " + storeCode + " - " + businessDate;
            titleCell.setCellValue(titleText);
            titleCell.setCellStyle(titleStyle);
            CellRangeAddress titleRegion = new CellRangeAddress(0, 0, 0, lastColumnIndex);
            sheet.addMergedRegion(titleRegion);
            applyRegionStyle(sheet, titleRegion, titleStyle);

            rowIdx++;

            for (Brand brand : activeBrands) {
                List<Item> brandItems = itemsByBrand.getOrDefault(brand.getCode(), java.util.Collections.emptyList());
                List<Item> visibleItems = brandItems.stream().filter(item -> {
                    String itemCode = item.getItemCode();
                    boolean hasData = activeSizes.stream().anyMatch(size -> {
                        String sizeCode = size.getCode();
                        DSR d = Optional.ofNullable(dsrMap.get(itemCode))
                                .map(m -> m.get(sizeCode))
                                .orElse(null);
                        SaleAgg sAgg = Optional.ofNullable(salesMap.get(itemCode))
                                .map(m -> m.get(sizeCode))
                                .orElse(null);

                        int opening = d != null && d.getOpening() != null ? d.getOpening() : 0;
                        int inward = d != null && d.getInward() != null ? d.getInward() : 0;
                        int outward = d != null && d.getOutward() != null ? d.getOutward() : 0;
                        int saleQty = sAgg != null ? sAgg.qty : 0;
                        double amount = sAgg != null ? sAgg.amount : 0.0;
                        double mrp = d != null && d.getMrp() != null ? d.getMrp() : 0.0;

                        int closing = (opening + inward) - (outward + saleQty);

                        return opening != 0 || inward != 0 || outward != 0 || closing != 0 ||
                                saleQty != 0 || amount != 0.0 || mrp != 0.0;
                    });
                    return hasData;
                }).collect(Collectors.toList());

                if (visibleItems.isEmpty()) {
                    continue;
                }

                Row brandRow = sheet.createRow(rowIdx++);
                Cell brandCell = brandRow.createCell(0);
                brandCell.setCellValue(brand.getName());
                brandCell.setCellStyle(headerStyle);

                for (int col = 1; col <= colIdx; col++) {
                    Cell bc = brandRow.createCell(col);
                    bc.setCellStyle(footerCellStyle);
                }

                for (Item item : visibleItems) {
                    Row itemRow = sheet.createRow(rowIdx++);
                    int col = 0;
                    Cell itemNameCell = itemRow.createCell(col++);
                    itemNameCell.setCellValue(item.getItemName());
                    itemNameCell.setCellStyle(footerCellStyle);

                    Map<String, DSR> itemDsr = dsrMap.getOrDefault(item.getItemCode(), java.util.Collections.emptyMap());
                    Map<String, SaleAgg> itemSales = salesMap.getOrDefault(item.getItemCode(), java.util.Collections.emptyMap());

                    for (Size size : activeSizes) {
                        DSR d = itemDsr.get(size.getCode());
                        int opening = d != null && d.getOpening() != null ? d.getOpening() : 0;
                        Cell openingCell = itemRow.createCell(col++);
                        openingCell.setCellValue(opening > 0 ? opening : 0);
                        openingCell.setCellStyle(footerCellStyle);
                    }

                    for (Size size : activeSizes) {
                        DSR d = itemDsr.get(size.getCode());
                        int inward = d != null && d.getInward() != null ? d.getInward() : 0;
                        Cell inwardCell = itemRow.createCell(col++);
                        inwardCell.setCellValue(inward > 0 ? inward : 0);
                        inwardCell.setCellStyle(footerCellStyle);
                    }

                    for (Size size : activeSizes) {
                        DSR d = itemDsr.get(size.getCode());
                        int outward = d != null && d.getOutward() != null ? d.getOutward() : 0;
                        Cell outwardCell = itemRow.createCell(col++);
                        outwardCell.setCellValue(outward > 0 ? outward : 0);
                        outwardCell.setCellStyle(footerCellStyle);
                    }

                    for (Size size : activeSizes) {
                        DSR d = itemDsr.get(size.getCode());
                        SaleAgg sAgg = itemSales.get(size.getCode());
                        int opening = d != null && d.getOpening() != null ? d.getOpening() : 0;
                        int inward = d != null && d.getInward() != null ? d.getInward() : 0;
                        int outward = d != null && d.getOutward() != null ? d.getOutward() : 0;
                        int saleQty = sAgg != null ? sAgg.qty : 0;
                        int closing = (opening + inward) - (outward + saleQty);
                        Cell closingCell = itemRow.createCell(col++);
                        closingCell.setCellValue(closing != 0 ? closing : 0);
                        closingCell.setCellStyle(footerCellStyle);
                    }

                    for (Size size : activeSizes) {
                        SaleAgg sAgg = itemSales.get(size.getCode());
                        int qty = sAgg != null ? sAgg.qty : 0;
                        Cell saleQtyCell = itemRow.createCell(col++);
                        saleQtyCell.setCellValue(qty > 0 ? qty : 0);
                        saleQtyCell.setCellStyle(footerCellStyle);
                    }

                    for (Size size : activeSizes) {
                        DSR d = itemDsr.get(size.getCode());
                        double mrp = d != null && d.getMrp() != null ? d.getMrp() : 0.0;
                        Cell rateCell = itemRow.createCell(col++);
                        rateCell.setCellValue(mrp > 0.0 ? mrp : 0.0);
                        rateCell.setCellStyle(footerCellStyle);
                    }

                    for (Size size : activeSizes) {
                        SaleAgg sAgg = itemSales.get(size.getCode());
                        double amount = sAgg != null ? sAgg.amount : 0.0;
                        Cell amountCell = itemRow.createCell(col++);
                        amountCell.setCellValue(amount > 0.0 ? amount : 0.0);
                        amountCell.setCellStyle(footerCellStyle);
                    }

                    Cell remarksCell = itemRow.createCell(col);
                    remarksCell.setCellStyle(footerCellStyle);

                    for (Size size : activeSizes) {
                        DSR d = itemDsr.get(size.getCode());
                        SaleAgg sAgg = itemSales.get(size.getCode());
                        int opening = d != null && d.getOpening() != null ? d.getOpening() : 0;
                        int inward = d != null && d.getInward() != null ? d.getInward() : 0;
                        int outward = d != null && d.getOutward() != null ? d.getOutward() : 0;
                        int saleQty = sAgg != null ? sAgg.qty : 0;
                        double amount = sAgg != null ? sAgg.amount : 0.0;

                        int closing = (opening + inward) - (outward + saleQty);

                        Map<String, Integer> gt = grandTotals.get(size.getCode());
                        gt.put("opening", gt.get("opening") + opening);
                        gt.put("inward", gt.get("inward") + inward);
                        gt.put("outward", gt.get("outward") + outward);
                        gt.put("closing", gt.get("closing") + closing);
                        gt.put("sale", gt.get("sale") + saleQty);
                        gt.put("amount", gt.get("amount") + (int) Math.round(amount));
                    }
                }
            }

            Row totalRow = sheet.createRow(rowIdx++);
            Cell totalLabel = totalRow.createCell(0);
            totalLabel.setCellValue("GRAND TOTAL");
            totalLabel.setCellStyle(headerStyle);

            int col = 1;
            for (Size size : activeSizes) {
                int v = grandTotals.get(size.getCode()).get("opening");
                Cell openingTotalCell = totalRow.createCell(col++);
                openingTotalCell.setCellValue(v != 0 ? v : 0);
                openingTotalCell.setCellStyle(footerCellStyle);
            }
            for (Size size : activeSizes) {
                int v = grandTotals.get(size.getCode()).get("inward");
                Cell inwardTotalCell = totalRow.createCell(col++);
                inwardTotalCell.setCellValue(v != 0 ? v : 0);
                inwardTotalCell.setCellStyle(footerCellStyle);
            }
            for (Size size : activeSizes) {
                int v = grandTotals.get(size.getCode()).get("outward");
                Cell outwardTotalCell = totalRow.createCell(col++);
                outwardTotalCell.setCellValue(v != 0 ? v : 0);
                outwardTotalCell.setCellStyle(footerCellStyle);
            }
            for (Size size : activeSizes) {
                int v = grandTotals.get(size.getCode()).get("closing");
                Cell closingTotalCell = totalRow.createCell(col++);
                closingTotalCell.setCellValue(v != 0 ? v : 0);
                closingTotalCell.setCellStyle(footerCellStyle);
            }
            for (Size size : activeSizes) {
                int v = grandTotals.get(size.getCode()).get("sale");
                Cell saleTotalCell = totalRow.createCell(col++);
                saleTotalCell.setCellValue(v != 0 ? v : 0);
                saleTotalCell.setCellStyle(footerCellStyle);
            }
            for (Size ignored : activeSizes) {
                Cell emptyRateCell = totalRow.createCell(col++);
                emptyRateCell.setCellValue("");
                emptyRateCell.setCellStyle(footerCellStyle);
            }
            for (Size size : activeSizes) {
                int v = grandTotals.get(size.getCode()).get("amount");
                Cell amountTotalCell = totalRow.createCell(col++);
                amountTotalCell.setCellValue(v != 0 ? v : 0);
                amountTotalCell.setCellStyle(footerCellStyle);
            }
            Cell remarksTotalCell = totalRow.createCell(col);
            remarksTotalCell.setCellStyle(footerCellStyle);

            rowIdx++;

            int baseRow = rowIdx;
            int catCol = 0;
            int otherCol = 4;
            int expCol = 8;
            int collCol = 12;

            Row footerHeaderRow = sheet.createRow(baseRow);

            Cell catHeaderCell = footerHeaderRow.createCell(catCol);
            catHeaderCell.setCellValue("CATEGORY WISE SALE");
            catHeaderCell.setCellStyle(footerHeaderStyle);
            CellRangeAddress catHeaderRegion = new CellRangeAddress(baseRow, baseRow, catCol, catCol + 1);
            sheet.addMergedRegion(catHeaderRegion);
            applyRegionStyle(sheet, catHeaderRegion, footerHeaderStyle);

            Cell otherHeaderCell = footerHeaderRow.createCell(otherCol);
            otherHeaderCell.setCellValue("OTHER SALE");
            otherHeaderCell.setCellStyle(footerHeaderStyle);
            CellRangeAddress otherHeaderRegion = new CellRangeAddress(baseRow, baseRow, otherCol, otherCol + 1);
            sheet.addMergedRegion(otherHeaderRegion);
            applyRegionStyle(sheet, otherHeaderRegion, footerHeaderStyle);

            Cell expHeaderCell = footerHeaderRow.createCell(expCol);
            expHeaderCell.setCellValue("SHOP EXPENSES");
            expHeaderCell.setCellStyle(footerHeaderStyle);
            CellRangeAddress expHeaderRegion = new CellRangeAddress(baseRow, baseRow, expCol, expCol + 1);
            sheet.addMergedRegion(expHeaderRegion);
            applyRegionStyle(sheet, expHeaderRegion, footerHeaderStyle);

            Cell collHeaderCell = footerHeaderRow.createCell(collCol);
            collHeaderCell.setCellValue("COLLECTION DETAIL");
            collHeaderCell.setCellStyle(footerHeaderStyle);
            CellRangeAddress collHeaderRegion = new CellRangeAddress(baseRow, baseRow, collCol, collCol + 1);
            sheet.addMergedRegion(collHeaderRegion);
            applyRegionStyle(sheet, collHeaderRegion, footerHeaderStyle);

            java.util.List<Map.Entry<String, Double>> catList = new java.util.ArrayList<>(categoryTotals.entrySet());
            int catRows = catList.size();
            int otherRows = saleLedgers.size();
            int expRows = expenseLedgers.size();
            int collRows = tenderLedgers.size();

            int maxRows = Math.max(Math.max(catRows, otherRows), Math.max(expRows, collRows));

            for (int i = 0; i < maxRows; i++) {
                Row r = sheet.getRow(baseRow + 1 + i);
                if (r == null) {
                    r = sheet.createRow(baseRow + 1 + i);
                }

                if (i < catRows) {
                    Map.Entry<String, Double> entry = catList.get(i);
                    Cell c1 = r.createCell(catCol);
                    c1.setCellValue(entry.getKey());
                    c1.setCellStyle(footerCellStyle);
                    Cell c2 = r.createCell(catCol + 1);
                    c2.setCellValue(entry.getValue());
                    c2.setCellStyle(footerCellStyle);
                }

                if (i < otherRows) {
                    Ledger ledger = saleLedgers.get(i);
                    Cell c1 = r.createCell(otherCol);
                    c1.setCellValue(ledger.getName());
                    c1.setCellStyle(footerCellStyle);
                    double v = saleTotals.getOrDefault(ledger.getCode(), 0.0);
                    Cell c2 = r.createCell(otherCol + 1);
                    c2.setCellValue(v);
                    c2.setCellStyle(footerCellStyle);
                }

                if (i < expRows) {
                    Ledger ledger = expenseLedgers.get(i);
                    Cell c1 = r.createCell(expCol);
                    c1.setCellValue(ledger.getName());
                    c1.setCellStyle(footerCellStyle);
                    double v = expenseTotals.getOrDefault(ledger.getCode(), 0.0);
                    Cell c2 = r.createCell(expCol + 1);
                    c2.setCellValue(v);
                    c2.setCellStyle(footerCellStyle);
                }

                if (i < collRows) {
                    Ledger ledger = tenderLedgers.get(i);
                    Cell c1 = r.createCell(collCol);
                    c1.setCellValue(ledger.getName());
                    c1.setCellStyle(footerCellStyle);
                    double v = tenderTotals.getOrDefault(ledger.getCode(), 0.0);
                    Cell c2 = r.createCell(collCol + 1);
                    c2.setCellValue(v);
                    c2.setCellStyle(footerCellStyle);
                }
            }

            Row catTotalRow = sheet.getRow(baseRow + 1 + maxRows);
            if (catTotalRow == null) {
                catTotalRow = sheet.createRow(baseRow + 1 + maxRows);
            }
            Cell ctLabel = catTotalRow.createCell(catCol);
            ctLabel.setCellValue("TOTAL");
            ctLabel.setCellStyle(footerHeaderStyle);
            Cell ctVal = catTotalRow.createCell(catCol + 1);
            ctVal.setCellValue(totalSaleAmount);
            ctVal.setCellStyle(footerCellStyle);

            Row osTotalRow = sheet.getRow(baseRow + 1 + maxRows);
            if (osTotalRow == null) {
                osTotalRow = sheet.createRow(baseRow + 1 + maxRows);
            }
            Cell osLabel = osTotalRow.createCell(otherCol);
            osLabel.setCellValue("TOTAL");
            osLabel.setCellStyle(footerHeaderStyle);
            Cell osVal = osTotalRow.createCell(otherCol + 1);
            osVal.setCellValue(totalOtherSale);
            osVal.setCellStyle(footerCellStyle);

            Row expTotalRow = sheet.getRow(baseRow + 1 + maxRows);
            if (expTotalRow == null) {
                expTotalRow = sheet.createRow(baseRow + 1 + maxRows);
            }
            Cell expLabel = expTotalRow.createCell(expCol);
            expLabel.setCellValue("TOTAL");
            expLabel.setCellStyle(footerHeaderStyle);
            Cell expVal = expTotalRow.createCell(expCol + 1);
            expVal.setCellValue(totalExpense);
            expVal.setCellStyle(footerCellStyle);

            Row collTotalRow = sheet.getRow(baseRow + 1 + maxRows);
            if (collTotalRow == null) {
                collTotalRow = sheet.createRow(baseRow + 1 + maxRows);
            }
            Cell collLabel = collTotalRow.createCell(collCol);
            collLabel.setCellValue("TOTAL");
            collLabel.setCellStyle(footerHeaderStyle);
            Cell collVal = collTotalRow.createCell(collCol + 1);
            collVal.setCellValue(totalTender);
            collVal.setCellStyle(footerCellStyle);

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private void applyRegionStyle(Sheet sheet, CellRangeAddress region, CellStyle style) {
        for (int row = region.getFirstRow(); row <= region.getLastRow(); row++) {
            Row r = sheet.getRow(row);
            if (r == null) {
                r = sheet.createRow(row);
            }
            for (int col = region.getFirstColumn(); col <= region.getLastColumn(); col++) {
                Cell cell = r.getCell(col);
                if (cell == null) {
                    cell = r.createCell(col);
                }
                cell.setCellStyle(style);
            }
        }
    }

    public void populateDSR(String storeCode, String businessDate, String userName) {
        System.out.println("populateDSR called for Store: " + storeCode + ", Date: " + businessDate + ", User: " + userName);
        // 0. Create DSR Head if not exists
        Optional<DSRHead> headOpt = dsrHeadRepository.findByStoreCodeAndDsrDate(storeCode, businessDate);
        if (headOpt.isEmpty()) {
            System.out.println("Creating new DSR Head...");
            DSRHead head = new DSRHead();
            head.setStoreCode(storeCode);
            head.setDsrDate(businessDate);
            head.setUserName(userName);
            head.setDsrStatus("NEW");
            head.setCreatedAt(LocalDateTime.now());
            head.setUpdatedAt(LocalDateTime.now());
            dsrHeadRepository.save(head);
            System.out.println("DSR Head created with ID: " + head.getId());
        } else {
            System.out.println("DSR Head already exists: " + headOpt.get().getId());
            DSRHead head = headOpt.get();
            // Update username if it was null or different (and new username is provided)
            if (userName != null && !userName.isEmpty() && 
                (head.getUserName() == null || !head.getUserName().equals(userName))) {
                head.setUserName(userName);
                head.setUpdatedAt(LocalDateTime.now());
                dsrHeadRepository.save(head);
                System.out.println("Updated DSR Head username to: " + userName);
            }
        }

        // Fetch all inventory items for the store
        // Note: InventoryMasterRepository needs a method to find by storeCode
        // Assuming findByStoreCode exists or we'll add it. 
        // Based on previous read, it only has findByStoreCodeAndItemCodeAndSizeCode.
        // I will need to update InventoryMasterRepository to include findByStoreCode.
        List<InventoryMaster> inventoryItems = inventoryMasterRepository.findByStoreCode(storeCode);
        System.out.println("Found " + inventoryItems.size() + " inventory items for store: " + storeCode);

        // Fetch STI Items for this store and date to populate Inward
        List<StiItem> stiItems = stiItemRepository.findByToStoreAndStiDate(storeCode, businessDate);
        System.out.println("Querying STI Items with Store: '" + storeCode + "' and Date: '" + businessDate + "'");
        System.out.println("Found " + stiItems.size() + " STI items for Inward population");
        
        Map<String, Integer> stiMap = new HashMap<>();
        for (StiItem sti : stiItems) {
            String key = sti.getItemCode() + "_" + sti.getSizeCode();
            stiMap.put(key, stiMap.getOrDefault(key, 0) + sti.getQuantity());
        }

        // Fetch STO Items for this store (FromStore) and date to populate Outward (Transfer)
        List<StoItem> stoItems = stoItemRepository.findByFromStoreAndStoDate(storeCode, businessDate);
        System.out.println("Querying STO Items with FromStore: '" + storeCode + "' and Date: '" + businessDate + "'");
        System.out.println("Found " + stoItems.size() + " STO items for Outward population");

        Map<String, Integer> stoMap = new HashMap<>();
        for (StoItem sto : stoItems) {
            String key = sto.getItemCode() + "_" + sto.getSizeCode();
            stoMap.put(key, stoMap.getOrDefault(key, 0) + sto.getQuantity());
        }

        for (InventoryMaster inventory : inventoryItems) {
            Optional<DSR> existingDsr = dsrRepository.findByStoreAndBusinessDateAndItemCodeAndSizeCode(
                storeCode, businessDate, inventory.getItemCode(), inventory.getSizeCode()
            );

            if (existingDsr.isPresent()) {
                System.out.println("DSR Detail already exists for Item: " + inventory.getItemCode() + ", Size: " + inventory.getSizeCode());
                // Update Inward and Outward if they differ
                DSR dsr = existingDsr.get();
                String key = inventory.getItemCode() + "_" + inventory.getSizeCode();
                
                int inwardQty = stiMap.getOrDefault(key, 0);
                int outwardQty = stoMap.getOrDefault(key, 0);
                
                boolean updated = false;
                if (dsr.getInward() == null || dsr.getInward() != inwardQty) {
                    System.out.println("Updating Inward for DSR Item: " + inventory.getItemCode() + " from " + dsr.getInward() + " to " + inwardQty);
                    dsr.setInward(inwardQty);
                    updated = true;
                }
                
                if (dsr.getOutward() == null || dsr.getOutward() != outwardQty) {
                    System.out.println("Updating Outward for DSR Item: " + inventory.getItemCode() + " from " + dsr.getOutward() + " to " + outwardQty);
                    dsr.setOutward(outwardQty);
                    updated = true;
                }
                
                if (updated) {
                    // Recalculate Closing
                    int opening = dsr.getOpening() != null ? dsr.getOpening() : 0;
                    int inward = dsr.getInward() != null ? dsr.getInward() : 0;
                    int outward = dsr.getOutward() != null ? dsr.getOutward() : 0;
                    int sale = dsr.getSale() != null ? dsr.getSale() : 0;
                    dsr.setClosing(opening + inward - outward - sale);
                    
                    dsr.setUpdatedAt(LocalDateTime.now());
                    dsrRepository.save(dsr);
                }
                continue;
            }

            DSR dsr = new DSR();
            dsr.setStore(storeCode);
            dsr.setBusinessDate(businessDate);
            dsr.setItemCode(inventory.getItemCode());
            dsr.setItemName(inventory.getItemName());
            dsr.setSizeCode(inventory.getSizeCode());
            dsr.setSizeName(inventory.getSizeName());
            
            // Closing from Inventory becomes Opening in DSR
            dsr.setOpening(inventory.getClosing() != null ? inventory.getClosing() : 0); 
            
            // Initialize other stock fields
            // Populate Inward from STI
            String key = inventory.getItemCode() + "_" + inventory.getSizeCode();
            int inwardQty = stiMap.getOrDefault(key, 0);
            dsr.setInward(inwardQty);
            
            // Populate Outward from STO
            int outwardQty = stoMap.getOrDefault(key, 0);
            dsr.setOutward(outwardQty);
            
            dsr.setSale(0);
            // Closing = Opening + Inward - Outward - Sale
            dsr.setClosing(dsr.getOpening() + dsr.getInward() - dsr.getOutward()); 
 

            // Fetch Price details
            Optional<PriceMaster> priceOpt = priceMasterRepository.findByItemCodeAndSizeCode(inventory.getItemCode(), inventory.getSizeCode());
            if (priceOpt.isPresent()) {
                PriceMaster price = priceOpt.get();
                dsr.setPurchasePrice(price.getPurchasePrice());
                dsr.setMrp(price.getMrp());
            } else {
                dsr.setPurchasePrice(0.0);
                dsr.setMrp(0.0);
            }

            dsr.setCreatedAt(LocalDateTime.now());
            dsr.setUpdatedAt(LocalDateTime.now());

            dsrRepository.save(dsr);
            System.out.println("Created DSR Detail for Item: " + inventory.getItemCode());
        }
    }
}
