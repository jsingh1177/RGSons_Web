package MJC.RGSons.service;

import MJC.RGSons.dto.DSRSaveRequest;
import MJC.RGSons.model.DSR;
import MJC.RGSons.model.DSRHead;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.model.TranLedger;
import MJC.RGSons.model.Category;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Brand;
import MJC.RGSons.model.Size;
import MJC.RGSons.model.Ledger;
import MJC.RGSons.model.PurHead;
import MJC.RGSons.model.StiHead;
import MJC.RGSons.model.StoHead;
import MJC.RGSons.repository.DSRHeadRepository;
import MJC.RGSons.repository.PurHeadRepository;
import MJC.RGSons.repository.StiHeadRepository;
import MJC.RGSons.repository.StoHeadRepository;
import MJC.RGSons.repository.TranHeadRepository;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger logger = LoggerFactory.getLogger(DSRService.class);

    @Autowired
    private DSRHeadRepository dsrHeadRepository;

    @Autowired
    private StoHeadRepository stoHeadRepository;

    @Autowired
    private StiHeadRepository stiHeadRepository;

    @Autowired
    private TranItemRepository tranItemRepository;

    @Autowired
    private TranLedgerRepository tranLedgerRepository;

    @Autowired
    private TranHeadRepository tranHeadRepository;

    @Autowired
    private PurHeadRepository purHeadRepository;

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

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private volatile String resolvedItemTableName;

    private java.time.LocalDate parseBusinessDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return java.time.LocalDate.now();
        }
        try {
            if (dateStr.matches("\\d{2}-\\d{2}-\\d{4}")) {
                java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy");
                return java.time.LocalDate.parse(dateStr, formatter);
            }
            if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return java.time.LocalDate.parse(dateStr);
            }
        } catch (Exception e) {
            // ignore
        }
        return java.time.LocalDate.now();
    }

    private String resolveItemTableName() {
        String cached = resolvedItemTableName;
        if (cached != null && !cached.isBlank()) {
            return cached;
        }

        synchronized (this) {
            cached = resolvedItemTableName;
            if (cached != null && !cached.isBlank()) {
                return cached;
            }

            String[] candidates = new String[]{
                    "items",
                    "dbo.items",
                    "item",
                    "dbo.item"
            };

            for (String candidate : candidates) {
                if (tableExists(candidate)) {
                    resolvedItemTableName = candidate;
                    return candidate;
                }
            }

            resolvedItemTableName = "items";
            return resolvedItemTableName;
        }
    }

    private boolean tableExists(String tableName) {
        if (tableName == null || tableName.isBlank()) {
            return false;
        }
        try {
            jdbcTemplate.execute("SELECT TOP 0 1 FROM " + tableName);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public List<DSR> getDynamicDsrByStoreAndDate(String storeCode, String businessDate) {
        java.time.LocalDate sqlDate = parseBusinessDate(businessDate);
        java.sql.Date asOnSql = java.sql.Date.valueOf(sqlDate);

        String itemTableName = resolveItemTableName();
        String sql = String.format("""
            WITH OpeningStock AS (
                SELECT 
                    item_code, 
                    size_code, 
                    SUM(COALESCE(Opening, 0) + COALESCE(Purchase, 0) + COALESCE(Transfer_In, 0) - COALESCE(Transfer_Out, 0) - COALESCE(Sale, 0)) AS opening_bal
                FROM vw_InventoryClosing
                WHERE store_code = ? AND tran_date < ?
                GROUP BY item_code, size_code
            ),
            TodayMovements AS (
                SELECT 
                    item_code, 
                    size_code, 
                    SUM(COALESCE(Purchase, 0) + COALESCE(Transfer_In, 0)) AS inward,
                    SUM(COALESCE(Transfer_Out, 0)) AS outward,
                    SUM(COALESCE(Sale, 0)) AS sale
                FROM vw_InventoryClosing
                WHERE store_code = ? AND tran_date = ?
                GROUP BY item_code, size_code
            )
            SELECT 
                COALESCE(o.item_code, t.item_code) AS item_code,
                COALESCE(o.size_code, t.size_code) AS size_code,
                i.item_name,
                sz.name AS size_name,
                pm.Purchase_Price AS purchase_price,
                pm.MRP AS mrp,
                COALESCE(o.opening_bal, 0) AS opening,
                COALESCE(t.inward, 0) AS inward,
                COALESCE(t.outward, 0) AS outward,
                COALESCE(t.sale, 0) AS sale
            FROM OpeningStock o
            FULL OUTER JOIN TodayMovements t ON o.item_code = t.item_code AND o.size_code = t.size_code
            LEFT JOIN %s i ON i.item_code = COALESCE(o.item_code, t.item_code)
            LEFT JOIN size sz ON sz.code = COALESCE(o.size_code, t.size_code)
            LEFT JOIN Price_Master pm ON pm.Item_Code = COALESCE(o.item_code, t.item_code) AND pm.Size_Code = COALESCE(o.size_code, t.size_code)
            WHERE (COALESCE(o.opening_bal, 0) <> 0 OR COALESCE(t.inward, 0) <> 0 OR COALESCE(t.outward, 0) <> 0 OR COALESCE(t.sale, 0) <> 0)
        """, itemTableName);

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            DSR dsr = new DSR();
            dsr.setStore(storeCode);
            dsr.setBusinessDate(businessDate);
            dsr.setItemCode(rs.getString("item_code"));
            dsr.setItemName(rs.getString("item_name"));
            dsr.setSizeCode(rs.getString("size_code"));
            dsr.setSizeName(rs.getString("size_name"));
            
            dsr.setOpening(rs.getInt("opening"));
            dsr.setInward(rs.getInt("inward"));
            dsr.setOutward(rs.getInt("outward"));
            dsr.setSale(rs.getInt("sale"));
            
            int closing = dsr.getOpening() + dsr.getInward() - dsr.getOutward() - dsr.getSale();
            dsr.setClosing(closing);
            
            double purchasePrice = rs.getDouble("purchase_price");
            if (!rs.wasNull() && purchasePrice != 0) {
                dsr.setPurchasePrice(purchasePrice);
            } else {
                dsr.setPurchasePrice(0.0);
            }
            
            double mrp = rs.getDouble("mrp");
            if (!rs.wasNull() && mrp != 0) {
                dsr.setMrp(mrp);
            } else {
                dsr.setMrp(0.0);
            }
            
            return dsr;
        }, storeCode, asOnSql, storeCode, asOnSql);
    }

    public String getDSRStatus(String storeCode, String date) {
        Optional<DSRHead> headOpt = dsrHeadRepository.findByStoreCodeAndDsrDate(storeCode, date);
        if (headOpt.isPresent()) {
            return headOpt.get().getDsrStatus();
        }
        return "PENDING";
    }

    public List<Map<String, String>> validateBeforeSubmit(String storeCode, String businessDate) {
        if (storeCode == null || storeCode.isEmpty() || businessDate == null || businessDate.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<Map<String, String>> pending = new java.util.ArrayList<>();

        List<MJC.RGSons.model.TranHead> saleHeads = tranHeadRepository.findByStoreCodeAndInvoiceDate(storeCode, businessDate);
        for (MJC.RGSons.model.TranHead h : saleHeads) {
            String status = h.getStatus();
            if (status == null || !"SUBMITTED".equalsIgnoreCase(status)) {
                pending.add(Map.of(
                        "type", "Sale Voucher",
                        "number", h.getInvoiceNo() != null ? h.getInvoiceNo() : "",
                        "status", status != null ? status : "PENDING"
                ));
            }
        }

        List<StoHead> outgoingStos = stoHeadRepository.findByFromStoreAndDate(storeCode, businessDate);
        for (StoHead sto : outgoingStos) {
            String status = sto.getStatus();
            if (status == null || !"SUBMITTED".equalsIgnoreCase(status)) {
                pending.add(Map.of(
                        "type", "STO",
                        "number", sto.getStoNumber() != null ? sto.getStoNumber() : "",
                        "status", status != null ? status : "PENDING"
                ));
            }
        }

        List<StiHead> stis = stiHeadRepository.findByToStoreAndDate(storeCode, businessDate);
        for (StiHead sti : stis) {
            String receivedStatus = sti.getReceivedStatus();
            if (receivedStatus == null || !"RECEIVED".equalsIgnoreCase(receivedStatus)) {
                pending.add(Map.of(
                        "type", "STI",
                        "number", sti.getStiNumber() != null ? sti.getStiNumber() : "",
                        "status", receivedStatus != null ? receivedStatus : "PENDING"
                ));
            }
        }

        List<PurHead> purchases = purHeadRepository.findByStoreCodeAndInvoiceDate(storeCode, businessDate);
        for (PurHead p : purchases) {
            String status = p.getStatus();
            if (status == null || !"SUBMITTED".equalsIgnoreCase(status)) {
                pending.add(Map.of(
                        "type", "Purchase",
                        "number", p.getInvoiceNo() != null ? p.getInvoiceNo() : "",
                        "status", status != null ? status : "PENDING"
                ));
            }
        }

        return pending;
    }

    @Transactional
    public void saveDSR(DSRSaveRequest request) {
        if (logger.isDebugEnabled()) {
            logger.debug("Saving DSR request for store {} on {}", request != null ? request.getStoreCode() : null, request != null ? request.getDsrDate() : null);
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

        List<Map<String, String>> pending = validateBeforeSubmit(request.getStoreCode(), request.getDsrDate());
        if (pending != null && !pending.isEmpty()) {
            String msg = pending.stream()
                    .map(p -> (p.getOrDefault("type", "Voucher") + " " + p.getOrDefault("number", "") + " is not submitted (" + p.getOrDefault("status", "PENDING") + ")"))
                    .collect(java.util.stream.Collectors.joining("; "));
            throw new IllegalStateException(msg);
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

        // 2. DSR Details are dynamically generated, so we do not save them to dsr_detail anymore.
    }

    public ByteArrayInputStream exportDSRToExcel(String storeCode, String businessDate) throws IOException {
        List<DSR> dsrList = getDynamicDsrByStoreAndDate(storeCode, businessDate);
        List<TranItem> tranItems = tranItemRepository.findByStoreCodeAndInvoiceDate(storeCode, businessDate);
        List<TranLedger> tranLedgers = tranLedgerRepository.findByStoreCodeAndInvoiceDate(storeCode, businessDate);

        List<Size> activeSizes = sizeRepository.findByStatusOrderByNameAsc(true);
        List<Brand> activeBrands = brandRepository.findActiveBrands();
        List<Item> allItems = itemRepository.findAll().stream()
                .filter(i -> Boolean.TRUE.equals(i.getStatus()))
                .collect(Collectors.toList());

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
            for (int i = 0; i < activeSizes.size(); i++) {
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
        logger.debug("populateDSR called for store {} on {} by {}", storeCode, businessDate, userName);
        // 0. Create DSR Head if not exists
        Optional<DSRHead> headOpt = dsrHeadRepository.findByStoreCodeAndDsrDate(storeCode, businessDate);
        if (headOpt.isEmpty()) {
            logger.debug("Creating new DSR head for store {} on {}", storeCode, businessDate);
            DSRHead head = new DSRHead();
            head.setStoreCode(storeCode);
            head.setDsrDate(businessDate);
            head.setUserName(userName);
            head.setDsrStatus("NEW");
            head.setCreatedAt(LocalDateTime.now());
            head.setUpdatedAt(LocalDateTime.now());
            dsrHeadRepository.save(head);
            logger.debug("Created DSR head {}", head.getId());
        } else {
            logger.debug("DSR head already exists: {}", headOpt.get().getId());
            DSRHead head = headOpt.get();
            // Update username if it was null or different (and new username is provided)
            if (userName != null && !userName.isEmpty() && 
                (head.getUserName() == null || !head.getUserName().equals(userName))) {
                head.setUserName(userName);
                head.setUpdatedAt(LocalDateTime.now());
                dsrHeadRepository.save(head);
                logger.debug("Updated DSR head {} username", head.getId());
            }
        }
    }
}
