package MJC.RGSons.service;

import MJC.RGSons.dto.CategorySalesDTO;
import MJC.RGSons.dto.DsrStatusDTO;
import MJC.RGSons.dto.DayWiseSalesDTO;
import MJC.RGSons.dto.DistrictWiseDailySaleDTO;
import MJC.RGSons.dto.StockTransferDetailRowDTO;
import MJC.RGSons.dto.StockTransferSummaryDTO;
import MJC.RGSons.dto.StoreSalesDTO;
import MJC.RGSons.model.Category;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Store;
import MJC.RGSons.model.TranHead;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.repository.CategoryRepository;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.TranHeadRepository;
import MJC.RGSons.repository.TranItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReportService {

    @Autowired
    private TranHeadRepository tranHeadRepository;

    @Autowired
    private TranItemRepository tranItemRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public List<StoreSalesDTO> getStoreWiseSales(LocalDate startDate, LocalDate endDate) {
        List<String> dateRange = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            dateRange.add(current.format(formatter));
            current = current.plusDays(1);
        }

        List<TranHead> transactions = tranHeadRepository.findByInvoiceDateIn(dateRange);

        Map<String, Double> salesByStore = transactions.stream()
                .collect(Collectors.groupingBy(
                        TranHead::getStoreCode,
                        Collectors.summingDouble(t -> t.getTotalAmount() != null ? t.getTotalAmount() : 0.0)
                ));

        List<StoreSalesDTO> report = new ArrayList<>();
        for (Map.Entry<String, Double> entry : salesByStore.entrySet()) {
            String storeCode = entry.getKey();
            Double totalSales = entry.getValue();
            String storeName = "Unknown Store";

            Optional<Store> storeOpt = storeRepository.findByStoreCode(storeCode);
            if (storeOpt.isPresent()) {
                storeName = storeOpt.get().getStoreName();
            }

            report.add(new StoreSalesDTO(storeCode, storeName, totalSales));
        }

        return report;
    }

    public List<CategorySalesDTO> getCategoryWiseSales(LocalDate startDate, LocalDate endDate) {
        List<String> dateRange = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            dateRange.add(current.format(formatter));
            current = current.plusDays(1);
        }

        // 1. Get Transactions for the date range
        List<TranHead> transactions = tranHeadRepository.findByInvoiceDateIn(dateRange);
        List<String> invoiceNos = transactions.stream()
                .map(TranHead::getInvoiceNo)
                .collect(Collectors.toList());

        if (invoiceNos.isEmpty()) {
            return new ArrayList<>();
        }

        // 2. Get Transaction Items
        List<TranItem> tranItems = tranItemRepository.findByInvoiceNoIn(invoiceNos);

        // 3. Prepare caches for Item -> Category Code and Category Code -> Category Name
        Map<String, String> itemToCategoryMap = itemRepository.findAll().stream()
                .collect(Collectors.toMap(Item::getItemCode, Item::getCategoryCode, (v1, v2) -> v1));
        
        Map<String, String> categoryToNameMap = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(Category::getCode, Category::getName, (v1, v2) -> v1));

        // 4. Aggregate Sales by Category
        Map<String, Double> salesByCategory = new HashMap<>();

        for (TranItem item : tranItems) {
            String itemCode = item.getItemCode();
            String categoryCode = itemToCategoryMap.getOrDefault(itemCode, "UNKNOWN");
            String categoryName = categoryToNameMap.getOrDefault(categoryCode, "Unknown Category");
            
            salesByCategory.put(categoryName, salesByCategory.getOrDefault(categoryName, 0.0) + item.getAmount());
        }

        // 5. Convert to DTO
        List<CategorySalesDTO> report = new ArrayList<>();
        for (Map.Entry<String, Double> entry : salesByCategory.entrySet()) {
            report.add(new CategorySalesDTO(null, entry.getKey(), entry.getValue()));
        }

        return report;
    }

    public List<DayWiseSalesDTO> getDayWiseTotalSales(LocalDate startDate, LocalDate endDate) {
        String dateExpr = "COALESCE(tran_date, TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(invoice_date)), 1, 2))))";
        String sql = "SELECT " + dateExpr + " AS tranDate, SUM(COALESCE(total_amount, 0)) AS totalSales " +
                "FROM tran_head " +
                "WHERE status = 'SUBMITTED' AND " + dateExpr + " BETWEEN ? AND ? " +
                "GROUP BY " + dateExpr + " " +
                "ORDER BY tranDate";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                sql,
                java.sql.Date.valueOf(startDate),
                java.sql.Date.valueOf(endDate)
        );

        Map<LocalDate, Double> totalsByDay = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Object dObj = row.get("tranDate");
            if (!(dObj instanceof java.sql.Date d)) {
                continue;
            }
            Object totalObj = row.get("totalSales");
            double total = (totalObj instanceof Number n) ? n.doubleValue() : 0.0;
            totalsByDay.put(d.toLocalDate(), total);
        }

        List<DayWiseSalesDTO> result = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            result.add(new DayWiseSalesDTO(current.toString(), totalsByDay.getOrDefault(current, 0.0)));
            current = current.plusDays(1);
        }
        return result;
    }

    public List<DistrictWiseDailySaleDTO> getDistrictWiseDailySales(LocalDate startDate, LocalDate endDate, String district, String storeName) {
        String sql = """
                SELECT
                    COALESCE(s.district, '') AS districtName,
                    th.store_code AS storeCode,
                    COALESCE(s.store_name, th.store_code) AS storeName,
                    th.tran_date AS tranDate,
                    th.invoice_no AS billNumber,
                    CAST(COALESCE(th.total_qty, 0) AS INT) AS totalQty,
                    COALESCE(th.sale_amount, 0) AS saleAmount,
                    COALESCE(th.other_sale, 0) AS otherSale,
                    COALESCE(th.total_expenses, 0) AS expense,
                    (COALESCE(th.sale_amount, 0) + COALESCE(th.other_sale, 0) - COALESCE(th.total_expenses, 0)) AS totalSale,
                    COALESCE(th.total_tender, 0) AS tenderAmount
                FROM tran_head th
                LEFT JOIN store s ON s.store_code = th.store_code
                WHERE
                    th.status = 'SUBMITTED'
                    AND th.tran_date BETWEEN ? AND ?
                    AND (? IS NULL OR ? = '' OR s.district LIKE ?)
                    AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR th.store_code LIKE ?)
                ORDER BY
                    districtName,
                    storeCode,
                    tranDate,
                    billNumber
                """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                sql,
                java.sql.Date.valueOf(startDate),
                java.sql.Date.valueOf(endDate),
                district,
                district,
                "%" + (district != null ? district.trim() : "") + "%",
                storeName,
                storeName,
                "%" + (storeName != null ? storeName.trim() : "") + "%",
                "%" + (storeName != null ? storeName.trim() : "") + "%"
        );

        List<DistrictWiseDailySaleDTO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String districtName = row.get("districtName") != null ? row.get("districtName").toString() : "";
            String storeCode = row.get("storeCode") != null ? row.get("storeCode").toString() : "";
            String storeNameVal = row.get("storeName") != null ? row.get("storeName").toString() : "";
            String date = "";
            Object dObj = row.get("tranDate");
            if (dObj instanceof java.sql.Date d) {
                date = d.toLocalDate().toString();
            } else if (dObj != null) {
                date = dObj.toString();
            }
            String billNumber = row.get("billNumber") != null ? row.get("billNumber").toString() : "";
            Integer totalQty = row.get("totalQty") instanceof Number n ? n.intValue() : 0;
            Double saleAmount = row.get("saleAmount") instanceof Number n ? n.doubleValue() : 0.0;
            Double otherSale = row.get("otherSale") instanceof Number n ? n.doubleValue() : 0.0;
            Double expense = row.get("expense") instanceof Number n ? n.doubleValue() : 0.0;
            Double totalSale = row.get("totalSale") instanceof Number n ? n.doubleValue() : 0.0;
            Double tenderAmount = row.get("tenderAmount") instanceof Number n ? n.doubleValue() : 0.0;

            result.add(new DistrictWiseDailySaleDTO(
                    districtName,
                    storeCode,
                    storeNameVal,
                    date,
                    billNumber,
                    totalQty,
                    saleAmount,
                    otherSale,
                    expense,
                    totalSale,
                    tenderAmount
            ));
        }
        return result;
    }

    public java.io.ByteArrayInputStream exportDistrictWiseDailySalesToExcel(LocalDate startDate, LocalDate endDate, String district, String storeName) throws java.io.IOException {
        List<DistrictWiseDailySaleDTO> rows = getDistrictWiseDailySales(startDate, endDate, district, storeName);
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("District Wise Daily Sale");

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "DISTRICT NAME", "STORE CODE", "STORE NAME", "DATE", "BILL NUMBER", "TOTAL QTY",
                    "SALE AMOUNT", "OTHER SALE", "EXPENSE", "TOTAL SALE", "TENDER AMOUNT"
            };
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                org.apache.poi.ss.usermodel.CellStyle style = workbook.createCellStyle();
                org.apache.poi.ss.usermodel.Font font = workbook.createFont();
                font.setBold(true);
                style.setFont(font);
                cell.setCellStyle(style);
            }

            int r = 1;
            for (DistrictWiseDailySaleDTO row : rows) {
                org.apache.poi.ss.usermodel.Row excelRow = sheet.createRow(r++);
                excelRow.createCell(0).setCellValue(row.getDistrictName() != null ? row.getDistrictName() : "");
                excelRow.createCell(1).setCellValue(row.getStoreCode() != null ? row.getStoreCode() : "");
                excelRow.createCell(2).setCellValue(row.getStoreName() != null ? row.getStoreName() : "");
                excelRow.createCell(3).setCellValue(row.getDate() != null ? row.getDate() : "");
                excelRow.createCell(4).setCellValue(row.getBillNumber() != null ? row.getBillNumber() : "");

                org.apache.poi.ss.usermodel.Cell qtyCell = excelRow.createCell(5);
                if (row.getTotalQty() != null) qtyCell.setCellValue(row.getTotalQty());

                org.apache.poi.ss.usermodel.Cell saleCell = excelRow.createCell(6);
                if (row.getSaleAmount() != null) saleCell.setCellValue(row.getSaleAmount());

                org.apache.poi.ss.usermodel.Cell otherCell = excelRow.createCell(7);
                if (row.getOtherSale() != null) otherCell.setCellValue(row.getOtherSale());

                org.apache.poi.ss.usermodel.Cell expCell = excelRow.createCell(8);
                if (row.getExpense() != null) expCell.setCellValue(row.getExpense());

                org.apache.poi.ss.usermodel.Cell totalCell = excelRow.createCell(9);
                if (row.getTotalSale() != null) totalCell.setCellValue(row.getTotalSale());

                org.apache.poi.ss.usermodel.Cell tenderCell = excelRow.createCell(10);
                if (row.getTenderAmount() != null) tenderCell.setCellValue(row.getTenderAmount());
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return new java.io.ByteArrayInputStream(out.toByteArray());
        }
    }

    public List<StockTransferSummaryDTO> getStockTransferSummary(LocalDate startDate, LocalDate endDate, String district, String fromLocation, String toLocation, String storeCode) {
        String sql = """
                SELECT
                    COALESCE(st_to.district, '') AS districtName,
                    sh.tran_date AS tranDate,
                    sh.sto_number AS stoNumber,
                    COALESCE(st_from.store_name, sh.from_store) AS fromStore,
                    COALESCE(st_to.store_name, sh.to_store) AS toStore,
                    COALESCE(sh.total_qty, 0) AS totalQty,
                    CAST(ROUND((
                        SELECT COALESCE(SUM(COALESCE(si.amount, 0)), 0)
                        FROM sto_item si
                        WHERE si.sto_number = sh.sto_number
                    ), 2) AS DECIMAL(18, 2)) AS amount,
                    COALESCE(sh.received_status, '') AS receivedStatus
                FROM sto_head sh
                LEFT JOIN store st_from ON st_from.store_code = sh.from_store
                LEFT JOIN store st_to ON st_to.store_code = sh.to_store
                WHERE
                    sh.status = 'SUBMITTED'
                    AND sh.tran_date BETWEEN ? AND ?
                    AND (? IS NULL OR ? = '' OR st_to.district LIKE ?)
                    AND (? IS NULL OR ? = '' OR st_from.store_name LIKE ? OR sh.from_store LIKE ?)
                    AND (? IS NULL OR ? = '' OR st_to.store_name LIKE ? OR sh.to_store LIKE ?)
                    AND (? IS NULL OR ? = '' OR sh.from_store = ? OR sh.to_store = ?)
                ORDER BY
                    districtName,
                    tranDate,
                    fromStore,
                    toStore,
                    stoNumber
                """;

        String districtLike = "%" + (district != null ? district.trim() : "") + "%";
        String fromLike = "%" + (fromLocation != null ? fromLocation.trim() : "") + "%";
        String toLike = "%" + (toLocation != null ? toLocation.trim() : "") + "%";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                sql,
                java.sql.Date.valueOf(startDate),
                java.sql.Date.valueOf(endDate),
                district,
                district,
                districtLike,
                fromLocation,
                fromLocation,
                fromLike,
                fromLike,
                toLocation,
                toLocation,
                toLike,
                toLike,
                storeCode,
                storeCode,
                storeCode,
                storeCode
        );

        List<StockTransferSummaryDTO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String districtName = row.get("districtName") != null ? row.get("districtName").toString() : "";
            String date = "";
            Object dObj = row.get("tranDate");
            if (dObj instanceof java.sql.Date d) {
                date = d.toLocalDate().toString();
            } else if (dObj != null) {
                date = dObj.toString();
            }
            String stoNumber = row.get("stoNumber") != null ? row.get("stoNumber").toString() : "";
            String fromStore = row.get("fromStore") != null ? row.get("fromStore").toString() : "";
            String toStore = row.get("toStore") != null ? row.get("toStore").toString() : "";
            Integer totalQty = row.get("totalQty") instanceof Number n ? n.intValue() : 0;
            Double amount = row.get("amount") instanceof Number n ? n.doubleValue() : 0.0;
            String receivedStatus = row.get("receivedStatus") != null ? row.get("receivedStatus").toString() : "";
            result.add(new StockTransferSummaryDTO(districtName, date, stoNumber, fromStore, toStore, totalQty, amount, receivedStatus));
        }
        return result;
    }

    public java.io.ByteArrayInputStream exportStockTransferSummaryToExcel(LocalDate startDate, LocalDate endDate, String district, String fromLocation, String toLocation, String storeCode) throws java.io.IOException {
        List<StockTransferSummaryDTO> rows = getStockTransferSummary(startDate, endDate, district, fromLocation, toLocation, storeCode);
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Stock Transfer Summary");

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = { "DISTRICT", "DATE", "STO NO", "FROM STORE", "TO STORE", "TOTAL QTY", "AMOUNT", "RECEIVED STATUS" };
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            org.apache.poi.ss.usermodel.CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.setDataFormat(workbook.createDataFormat().getFormat("0.00"));

            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int r = 1;
            for (StockTransferSummaryDTO row : rows) {
                org.apache.poi.ss.usermodel.Row excelRow = sheet.createRow(r++);
                excelRow.createCell(0).setCellValue(row.getDistrictName() != null ? row.getDistrictName() : "");
                excelRow.createCell(1).setCellValue(row.getDate() != null ? row.getDate() : "");
                excelRow.createCell(2).setCellValue(row.getStoNumber() != null ? row.getStoNumber() : "");
                excelRow.createCell(3).setCellValue(row.getFromStore() != null ? row.getFromStore() : "");
                excelRow.createCell(4).setCellValue(row.getToStore() != null ? row.getToStore() : "");
                org.apache.poi.ss.usermodel.Cell qtyCell = excelRow.createCell(5);
                if (row.getTotalQty() != null) qtyCell.setCellValue(row.getTotalQty());
                org.apache.poi.ss.usermodel.Cell amtCell = excelRow.createCell(6);
                if (row.getAmount() != null) {
                    amtCell.setCellValue(row.getAmount());
                    amtCell.setCellStyle(amountStyle);
                }
                excelRow.createCell(7).setCellValue(row.getReceivedStatus() != null ? row.getReceivedStatus() : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return new java.io.ByteArrayInputStream(out.toByteArray());
        }
    }

    public List<StockTransferDetailRowDTO> getStockTransferDetail(LocalDate startDate, LocalDate endDate, String district, String fromLocation, String toLocation, String storeCode) {
        String sql = """
                SELECT
                    COALESCE(st_to.district, '') AS districtName,
                    sh.tran_date AS tranDate,
                    COALESCE(st_from.store_name, sh.from_store) AS fromStore,
                    COALESCE(st_to.store_name, sh.to_store) AS toStore,
                    sh.sto_number AS stoNumber,
                    COALESCE(sh.received_status, '') AS receivedStatus,
                    si.item_code AS itemCode,
                    COALESCE(it.item_name, si.item_code) AS itemName,
                    si.size_code AS sizeCode,
                    COALESCE(sz.name, si.size_code) AS sizeName,
                    CAST(COALESCE(SUM(si.quantity), 0) AS INT) AS quantity
                FROM sto_head sh
                JOIN sto_item si ON si.sto_number = sh.sto_number
                LEFT JOIN store st_from ON st_from.store_code = sh.from_store
                LEFT JOIN store st_to ON st_to.store_code = sh.to_store
                LEFT JOIN items it ON it.item_code = si.item_code
                LEFT JOIN size sz ON sz.code = si.size_code
                WHERE
                    sh.status = 'SUBMITTED'
                    AND sh.tran_date BETWEEN ? AND ?
                    AND (? IS NULL OR ? = '' OR st_to.district LIKE ?)
                    AND (? IS NULL OR ? = '' OR st_from.store_name LIKE ? OR sh.from_store LIKE ?)
                    AND (? IS NULL OR ? = '' OR st_to.store_name LIKE ? OR sh.to_store LIKE ?)
                    AND (? IS NULL OR ? = '' OR sh.from_store = ? OR sh.to_store = ?)
                GROUP BY
                    st_to.district,
                    sh.tran_date,
                    st_from.store_name,
                    sh.from_store,
                    st_to.store_name,
                    sh.to_store,
                    sh.sto_number,
                    sh.received_status,
                    si.item_code,
                    it.item_name,
                    si.size_code,
                    sz.name
                ORDER BY
                    districtName,
                    tranDate,
                    fromStore,
                    toStore,
                    stoNumber,
                    itemName,
                    sizeCode
                """;

        String districtLike = "%" + (district != null ? district.trim() : "") + "%";
        String fromLike = "%" + (fromLocation != null ? fromLocation.trim() : "") + "%";
        String toLike = "%" + (toLocation != null ? toLocation.trim() : "") + "%";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                sql,
                java.sql.Date.valueOf(startDate),
                java.sql.Date.valueOf(endDate),
                district,
                district,
                districtLike,
                fromLocation,
                fromLocation,
                fromLike,
                fromLike,
                toLocation,
                toLocation,
                toLike,
                toLike,
                storeCode,
                storeCode,
                storeCode,
                storeCode
        );

        List<StockTransferDetailRowDTO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String districtName = row.get("districtName") != null ? row.get("districtName").toString() : "";
            String date = "";
            Object dObj = row.get("tranDate");
            if (dObj instanceof java.sql.Date d) {
                date = d.toLocalDate().toString();
            } else if (dObj != null) {
                date = dObj.toString();
            }
            String fromStore = row.get("fromStore") != null ? row.get("fromStore").toString() : "";
            String toStore = row.get("toStore") != null ? row.get("toStore").toString() : "";
            String stoNumber = row.get("stoNumber") != null ? row.get("stoNumber").toString() : "";
            String receivedStatus = row.get("receivedStatus") != null ? row.get("receivedStatus").toString() : "";
            String itemCode = row.get("itemCode") != null ? row.get("itemCode").toString() : "";
            String itemName = row.get("itemName") != null ? row.get("itemName").toString() : "";
            String sizeCode = row.get("sizeCode") != null ? row.get("sizeCode").toString() : "";
            String sizeName = row.get("sizeName") != null ? row.get("sizeName").toString() : "";
            Integer quantity = row.get("quantity") instanceof Number n ? n.intValue() : 0;
            result.add(new StockTransferDetailRowDTO(districtName, date, fromStore, toStore, stoNumber, receivedStatus, itemCode, itemName, sizeCode, sizeName, quantity));
        }
        return result;
    }

    public java.io.ByteArrayInputStream exportStockTransferDetailToExcel(LocalDate startDate, LocalDate endDate, String district, String fromLocation, String toLocation, String storeCode) throws java.io.IOException {
        List<StockTransferDetailRowDTO> data = getStockTransferDetail(startDate, endDate, district, fromLocation, toLocation, storeCode);

        List<Map<String, Object>> sizeRows = jdbcTemplate.queryForList(
                "SELECT code, name FROM size WHERE status = 1 ORDER BY COALESCE(short_order, 999999), name"
        );
        Map<String, String> sizeNameByCode = new HashMap<>();
        List<String> orderedSizeCodes = new ArrayList<>();
        for (Map<String, Object> r : sizeRows) {
            String code = r.get("code") != null ? r.get("code").toString() : "";
            String name = r.get("name") != null ? r.get("name").toString() : code;
            if (!code.isBlank()) {
                sizeNameByCode.put(code, name);
                orderedSizeCodes.add(code);
            }
        }

        java.util.Set<String> usedSizeCodes = new java.util.HashSet<>();
        for (StockTransferDetailRowDTO r : data) {
            if (r.getSizeCode() != null && !r.getSizeCode().isBlank()) {
                usedSizeCodes.add(r.getSizeCode());
            }
        }
        List<String> dynamicSizeCodes = orderedSizeCodes.stream()
                .filter(usedSizeCodes::contains)
                .collect(Collectors.toList());
        usedSizeCodes.stream()
                .filter(c -> !dynamicSizeCodes.contains(c))
                .sorted(String::compareTo)
                .forEach(dynamicSizeCodes::add);

        Map<String, StockTransferDetailPivotRow> pivot = new java.util.LinkedHashMap<>();
        for (StockTransferDetailRowDTO r : data) {
            String key = (r.getDistrictName() != null ? r.getDistrictName() : "") + "||"
                    + (r.getDate() != null ? r.getDate() : "") + "||"
                    + (r.getFromStore() != null ? r.getFromStore() : "") + "||"
                    + (r.getToStore() != null ? r.getToStore() : "") + "||"
                    + (r.getStoNumber() != null ? r.getStoNumber() : "") + "||"
                    + (r.getReceivedStatus() != null ? r.getReceivedStatus() : "") + "||"
                    + (r.getItemCode() != null ? r.getItemCode() : "");

            StockTransferDetailPivotRow agg = pivot.computeIfAbsent(key, k -> {
                StockTransferDetailPivotRow pr = new StockTransferDetailPivotRow();
                pr.districtName = r.getDistrictName();
                pr.date = r.getDate();
                pr.fromStore = r.getFromStore();
                pr.toStore = r.getToStore();
                pr.stoNumber = r.getStoNumber();
                pr.receivedStatus = r.getReceivedStatus();
                pr.itemCode = r.getItemCode();
                pr.itemName = r.getItemName();
                pr.sizeQty = new HashMap<>();
                return pr;
            });
            String sizeCode = r.getSizeCode() != null ? r.getSizeCode() : "";
            int qty = r.getQuantity() != null ? r.getQuantity() : 0;
            if (!sizeCode.isBlank()) {
                agg.sizeQty.put(sizeCode, agg.sizeQty.getOrDefault(sizeCode, 0) + qty);
            }
        }

        List<StockTransferDetailPivotRow> rows = new ArrayList<>(pivot.values());
        rows.sort((a, b) -> {
            int c = safe(a.districtName).compareTo(safe(b.districtName));
            if (c != 0) return c;
            c = safe(a.date).compareTo(safe(b.date));
            if (c != 0) return c;
            c = safe(a.fromStore).compareTo(safe(b.fromStore));
            if (c != 0) return c;
            c = safe(a.toStore).compareTo(safe(b.toStore));
            if (c != 0) return c;
            c = safe(a.stoNumber).compareTo(safe(b.stoNumber));
            if (c != 0) return c;
            return safe(a.itemName).compareTo(safe(b.itemName));
        });

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Stock Transfer Detail");

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);

            org.apache.poi.ss.usermodel.CellStyle textStyle = workbook.createCellStyle();
            textStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            textStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            textStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            textStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);

            org.apache.poi.ss.usermodel.CellStyle numberStyle = workbook.createCellStyle();
            numberStyle.cloneStyleFrom(textStyle);
            numberStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.RIGHT);

            int totalCols = 7 + dynamicSizeCodes.size() + 1;

            org.apache.poi.ss.usermodel.Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(26);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            String title = "Stock Transfer Detail Report (" + startDate + " to " + endDate + ")";
            titleCell.setCellValue(title);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, totalCols - 1));

            org.apache.poi.ss.usermodel.Row filterRow = sheet.createRow(1);
            org.apache.poi.ss.usermodel.Cell filterCell = filterRow.createCell(0);
            String filterText = "District: " + safe(district) + " | From Location: " + safe(fromLocation) + " | To Location: " + safe(toLocation);
            filterCell.setCellValue(filterText);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(1, 1, 0, totalCols - 1));

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(2);
            int c = 0;
            String[] fixedHeaders = new String[] { "DISTRICT", "DATE", "FROM STORE", "TO STORE", "STO NO", "RECEIVED STATUS", "ITEM NAME" };
            for (String h : fixedHeaders) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(h);
                cell.setCellStyle(headerStyle);
            }
            for (String sizeCode : dynamicSizeCodes) {
                String name = sizeNameByCode.getOrDefault(sizeCode, sizeCode);
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(name);
                cell.setCellStyle(headerStyle);
            }
            org.apache.poi.ss.usermodel.Cell totalHeader = headerRow.createCell(c++);
            totalHeader.setCellValue("TOTAL");
            totalHeader.setCellStyle(headerStyle);

            int rIdx = 3;
            for (StockTransferDetailPivotRow r : rows) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                int col = 0;

                org.apache.poi.ss.usermodel.Cell cell0 = row.createCell(col++);
                cell0.setCellValue(safe(r.districtName));
                cell0.setCellStyle(textStyle);

                org.apache.poi.ss.usermodel.Cell cell1 = row.createCell(col++);
                cell1.setCellValue(safe(r.date));
                cell1.setCellStyle(textStyle);

                org.apache.poi.ss.usermodel.Cell cell2 = row.createCell(col++);
                cell2.setCellValue(safe(r.fromStore));
                cell2.setCellStyle(textStyle);

                org.apache.poi.ss.usermodel.Cell cell3 = row.createCell(col++);
                cell3.setCellValue(safe(r.toStore));
                cell3.setCellStyle(textStyle);

                org.apache.poi.ss.usermodel.Cell cell4 = row.createCell(col++);
                cell4.setCellValue(safe(r.stoNumber));
                cell4.setCellStyle(textStyle);

                org.apache.poi.ss.usermodel.Cell cell5 = row.createCell(col++);
                cell5.setCellValue(safe(r.receivedStatus));
                cell5.setCellStyle(textStyle);

                org.apache.poi.ss.usermodel.Cell cell6 = row.createCell(col++);
                cell6.setCellValue(safe(r.itemName));
                cell6.setCellStyle(textStyle);

                int total = 0;
                for (String sizeCode : dynamicSizeCodes) {
                    int qty = r.sizeQty.getOrDefault(sizeCode, 0);
                    total += qty;
                    org.apache.poi.ss.usermodel.Cell qtyCell = row.createCell(col++);
                    qtyCell.setCellValue(qty);
                    qtyCell.setCellStyle(numberStyle);
                }
                org.apache.poi.ss.usermodel.Cell totalCell = row.createCell(col++);
                totalCell.setCellValue(total);
                totalCell.setCellStyle(numberStyle);
            }

            for (int i = 0; i < totalCols; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return new java.io.ByteArrayInputStream(out.toByteArray());
        }
    }

    public List<DsrStatusDTO> getDsrStatus(LocalDate startDate, LocalDate endDate, String district, String storeName) {
        String sql = """
                SELECT
                    COALESCE(s.district, '') AS districtName,
                    th.store_code AS storeCode,
                    COALESCE(s.store_name, th.store_code) AS storeName,
                    th.tran_date AS tranDate,
                    COUNT(DISTINCT th.invoice_no) AS status
                FROM tran_head th
                LEFT JOIN store s ON s.store_code = th.store_code
                WHERE
                    th.status = 'SUBMITTED'
                    AND th.tran_date BETWEEN ? AND ?
                    AND (? IS NULL OR ? = '' OR s.district LIKE ?)
                    AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR th.store_code LIKE ?)
                GROUP BY
                    s.district,
                    th.store_code,
                    s.store_name,
                    th.tran_date
                ORDER BY
                    districtName,
                    storeCode,
                    tranDate
                """;

        String districtLike = "%" + (district != null ? district.trim() : "") + "%";
        String storeLike = "%" + (storeName != null ? storeName.trim() : "") + "%";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                sql,
                java.sql.Date.valueOf(startDate),
                java.sql.Date.valueOf(endDate),
                district,
                district,
                districtLike,
                storeName,
                storeName,
                storeLike,
                storeLike
        );

        List<DsrStatusDTO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String districtName = row.get("districtName") != null ? row.get("districtName").toString() : "";
            String storeCode = row.get("storeCode") != null ? row.get("storeCode").toString() : "";
            String storeNameVal = row.get("storeName") != null ? row.get("storeName").toString() : "";
            String date = "";
            Object dObj = row.get("tranDate");
            if (dObj instanceof java.sql.Date d) {
                date = d.toLocalDate().toString();
            } else if (dObj != null) {
                date = dObj.toString();
            }
            Integer status = row.get("status") instanceof Number n ? n.intValue() : 0;
            result.add(new DsrStatusDTO(districtName, storeCode, storeNameVal, date, status));
        }
        return result;
    }

    public java.io.ByteArrayInputStream exportDsrStatusToExcel(LocalDate startDate, LocalDate endDate, String district, String storeName) throws java.io.IOException {
        List<DsrStatusDTO> data = getDsrStatus(startDate, endDate, district, storeName);

        List<LocalDate> dateRange = new ArrayList<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            dateRange.add(cur);
            cur = cur.plusDays(1);
        }

        Map<String, DsrStatusPivotRow> pivot = new java.util.LinkedHashMap<>();
        for (DsrStatusDTO r : data) {
            String districtName = safe(r.getDistrictName());
            String storeCode = safe(r.getStoreCode());
            String storeNameVal = safe(r.getStoreName());
            String dateStr = safe(r.getDate());
            int status = r.getStatus() != null ? r.getStatus() : 0;

            if (storeCode.isBlank() || dateStr.isBlank()) continue;
            String key = districtName + "||" + storeCode + "||" + storeNameVal;
            DsrStatusPivotRow row = pivot.computeIfAbsent(key, k -> {
                DsrStatusPivotRow pr = new DsrStatusPivotRow();
                pr.districtName = districtName;
                pr.storeCode = storeCode;
                pr.storeName = storeNameVal;
                pr.byDate = new HashMap<>();
                return pr;
            });
            row.byDate.put(dateStr, row.byDate.getOrDefault(dateStr, 0) + status);
        }

        List<DsrStatusPivotRow> rows = new ArrayList<>(pivot.values());
        rows.sort((a, b) -> {
            int c = safe(a.districtName).compareTo(safe(b.districtName));
            if (c != 0) return c;
            c = safe(a.storeCode).compareTo(safe(b.storeCode));
            if (c != 0) return c;
            return safe(a.storeName).compareTo(safe(b.storeName));
        });

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("DSR Status");

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);

            org.apache.poi.ss.usermodel.CellStyle textStyle = workbook.createCellStyle();
            textStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            textStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            textStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            textStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);

            org.apache.poi.ss.usermodel.CellStyle centerStyle = workbook.createCellStyle();
            centerStyle.cloneStyleFrom(textStyle);
            centerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);

            int totalCols = 3 + dateRange.size();

            org.apache.poi.ss.usermodel.Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(26);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("DSR Status Report (" + startDate + " to " + endDate + ")");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, totalCols - 1));

            org.apache.poi.ss.usermodel.Row filterRow = sheet.createRow(1);
            org.apache.poi.ss.usermodel.Cell filterCell = filterRow.createCell(0);
            filterCell.setCellValue("District: " + safe(district) + " | Store: " + safe(storeName));
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(1, 1, 0, totalCols - 1));

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(2);
            int c = 0;
            String[] fixedHeaders = new String[]{"DISTRICT NAME", "STORE CODE", "STORE NAME"};
            for (String h : fixedHeaders) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(h);
                cell.setCellStyle(headerStyle);
            }
            for (LocalDate d : dateRange) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(d.getDayOfMonth());
                cell.setCellStyle(headerStyle);
            }

            int rIdx = 3;
            for (DsrStatusPivotRow r : rows) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                int col = 0;

                org.apache.poi.ss.usermodel.Cell cell0 = row.createCell(col++);
                cell0.setCellValue(safe(r.districtName));
                cell0.setCellStyle(textStyle);

                org.apache.poi.ss.usermodel.Cell cell1 = row.createCell(col++);
                cell1.setCellValue(safe(r.storeCode));
                cell1.setCellStyle(textStyle);

                org.apache.poi.ss.usermodel.Cell cell2 = row.createCell(col++);
                cell2.setCellValue(safe(r.storeName));
                cell2.setCellStyle(textStyle);

                for (LocalDate d : dateRange) {
                    String iso = d.toString();
                    Integer v = r.byDate.getOrDefault(iso, 0);
                    org.apache.poi.ss.usermodel.Cell cell = row.createCell(col++);
                    if (v != null && v == 1) {
                        cell.setCellValue(1);
                    } else {
                        cell.setCellValue("");
                    }
                    cell.setCellStyle(centerStyle);
                }
            }

            for (int i = 0; i < totalCols; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return new java.io.ByteArrayInputStream(out.toByteArray());
        }
    }

    private static String safe(String s) {
        return s != null ? s : "";
    }

    private static class StockTransferDetailPivotRow {
        private String districtName;
        private String date;
        private String fromStore;
        private String toStore;
        private String stoNumber;
        private String receivedStatus;
        private String itemCode;
        private String itemName;
        private Map<String, Integer> sizeQty;
    }

    private static class DsrStatusPivotRow {
        private String districtName;
        private String storeCode;
        private String storeName;
        private Map<String, Integer> byDate;
    }
}
