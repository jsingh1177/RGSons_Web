package MJC.RGSons.service;

import MJC.RGSons.dto.CategorySalesDTO;
import MJC.RGSons.dto.DsrStatusDTO;
import MJC.RGSons.dto.DayWiseSalesDTO;
import MJC.RGSons.dto.DistrictWiseDailySaleDTO;
import MJC.RGSons.dto.PriceSegmentExportRequestDTO;
import MJC.RGSons.dto.PriceSegmentExportRowDTO;
import MJC.RGSons.dto.PriceSegmentReportDTO;
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

    public List<DayWiseSalesDTO> getDayWiseTotalSales(LocalDate startDate, LocalDate endDate, String district, String storeName) {
        String dateExpr = "COALESCE(tran_head.tran_date, TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(tran_head.invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(tran_head.invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(tran_head.invoice_date)), 1, 2))))";
        String districtLike = "%" + (district != null ? district.trim() : "") + "%";
        String storeLike = "%" + (storeName != null ? storeName.trim() : "") + "%";
        String sql = "SELECT " + dateExpr + " AS tranDate, SUM(COALESCE(tran_head.total_amount, 0)) AS totalSales " +
                "FROM tran_head " +
                "LEFT JOIN store s ON s.store_code = tran_head.store_code " +
                "WHERE tran_head.status = 'SUBMITTED' AND " + dateExpr + " BETWEEN ? AND ? " +
                "AND (? IS NULL OR ? = '' OR s.district LIKE ?) " +
                "AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR tran_head.store_code LIKE ?) " +
                "GROUP BY " + dateExpr + " " +
                "ORDER BY tranDate";

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

    public List<DistrictWiseDailySaleDTO> getDistrictWiseDailySales(LocalDate startDate, LocalDate endDate, String district, String storeName, String partyName, String saleLedger) {
        String sql = """
                SELECT
                    COALESCE(s.district, '') AS districtName,
                    th.store_code AS storeCode,
                    COALESCE(s.store_name, th.store_code) AS storeName,
                    COALESCE(party.name, '') AS partyName,
                    COALESCE(saleLed.name, '') AS saleLedger,
                    th.tran_date AS tranDate,
                    th.invoice_no AS billNumber,
                    CAST(COALESCE(th.total_qty, 0) AS INT) AS totalQty,
                    COALESCE(th.sale_amount, 0) AS saleAmount,
                    COALESCE(th.other_sale, 0) AS otherSale,
                    COALESCE(th.total_expenses, 0) AS expense,
                    (COALESCE(th.sale_amount, 0) + COALESCE(th.other_sale, 0)) AS totalSale,
                    COALESCE(th.total_tender, 0) AS tenderAmount
                FROM tran_head th
                LEFT JOIN store s ON s.store_code = th.store_code
                LEFT JOIN led_master party ON party.code = th.party_code
                LEFT JOIN led_master saleLed ON saleLed.code = th.sale_led
                WHERE
                    th.status = 'SUBMITTED'
                    AND th.tran_date BETWEEN ? AND ?
                    AND (? IS NULL OR ? = '' OR s.district LIKE ?)
                    AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR th.store_code LIKE ?)
                    AND (? IS NULL OR ? = '' OR party.name LIKE ? OR th.party_code LIKE ?)
                    AND (? IS NULL OR ? = '' OR saleLed.name LIKE ? OR th.sale_led LIKE ?)
                ORDER BY
                    districtName,
                    storeCode,
                    tranDate,
                    billNumber
                """;

        String districtLike = "%" + (district != null ? district.trim() : "") + "%";
        String storeLike = "%" + (storeName != null ? storeName.trim() : "") + "%";
        String partyLike = "%" + (partyName != null ? partyName.trim() : "") + "%";
        String saleLedgerLike = "%" + (saleLedger != null ? saleLedger.trim() : "") + "%";

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
                storeLike,
                partyName,
                partyName,
                partyLike,
                partyLike,
                saleLedger,
                saleLedger,
                saleLedgerLike,
                saleLedgerLike
        );

        List<DistrictWiseDailySaleDTO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String districtName = row.get("districtName") != null ? row.get("districtName").toString() : "";
            String storeCode = row.get("storeCode") != null ? row.get("storeCode").toString() : "";
            String storeNameVal = row.get("storeName") != null ? row.get("storeName").toString() : "";
            String partyNameVal = row.get("partyName") != null ? row.get("partyName").toString() : "";
            String saleLedgerVal = row.get("saleLedger") != null ? row.get("saleLedger").toString() : "";
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
                    partyNameVal,
                    saleLedgerVal,
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

    public java.io.ByteArrayInputStream exportDistrictWiseDailySalesToExcel(LocalDate startDate, LocalDate endDate, String district, String storeName, String partyName, String saleLedger) throws java.io.IOException {
        List<DistrictWiseDailySaleDTO> rows = getDistrictWiseDailySales(startDate, endDate, district, storeName, partyName, saleLedger);
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("District Wise Daily Sale");

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "DISTRICT NAME", "STORE CODE", "STORE NAME", "PARTY NAME", "SALE LEDGER", "DATE", "BILL NUMBER", "TOTAL QTY",
                    "SALE AMOUNT", "OTHER SALE", "TOTAL SALE", "EXPENSE", "TENDER AMOUNT"
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
                excelRow.createCell(3).setCellValue(row.getPartyName() != null ? row.getPartyName() : "");
                excelRow.createCell(4).setCellValue(row.getSaleLedger() != null ? row.getSaleLedger() : "");
                excelRow.createCell(5).setCellValue(row.getDate() != null ? row.getDate() : "");
                excelRow.createCell(6).setCellValue(row.getBillNumber() != null ? row.getBillNumber() : "");

                org.apache.poi.ss.usermodel.Cell qtyCell = excelRow.createCell(7);
                if (row.getTotalQty() != null) qtyCell.setCellValue(row.getTotalQty());

                org.apache.poi.ss.usermodel.Cell saleCell = excelRow.createCell(8);
                if (row.getSaleAmount() != null) saleCell.setCellValue(row.getSaleAmount());

                org.apache.poi.ss.usermodel.Cell otherCell = excelRow.createCell(9);
                if (row.getOtherSale() != null) otherCell.setCellValue(row.getOtherSale());

                org.apache.poi.ss.usermodel.Cell totalCell = excelRow.createCell(10);
                if (row.getTotalSale() != null) totalCell.setCellValue(row.getTotalSale());

                org.apache.poi.ss.usermodel.Cell expCell = excelRow.createCell(11);
                if (row.getExpense() != null) expCell.setCellValue(row.getExpense());

                org.apache.poi.ss.usermodel.Cell tenderCell = excelRow.createCell(12);
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
                    CAST(ROUND(COALESCE(sh.Amount, 0), 2) AS DECIMAL(18, 2)) AS amount,
                    COALESCE(sh.status, '') AS status
                FROM sto_head sh
                LEFT JOIN store st_from ON st_from.store_code = sh.from_store
                LEFT JOIN store st_to ON st_to.store_code = sh.to_store
                WHERE
                    sh.tran_date BETWEEN ? AND ?
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
            String status = row.get("status") != null ? row.get("status").toString() : "";
            result.add(new StockTransferSummaryDTO(districtName, date, stoNumber, fromStore, toStore, totalQty, amount, status));
        }
        return result;
    }

    public java.io.ByteArrayInputStream exportStockTransferSummaryToExcel(LocalDate startDate, LocalDate endDate, String district, String fromLocation, String toLocation, String storeCode) throws java.io.IOException {
        List<StockTransferSummaryDTO> rows = getStockTransferSummary(startDate, endDate, district, fromLocation, toLocation, storeCode);
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Stock Transfer Summary");

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = { "DISTRICT", "DATE", "STO NO", "STATUS", "FROM STORE", "TO STORE", "TOTAL QTY", "AMOUNT" };
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
                excelRow.createCell(3).setCellValue(row.getReceivedStatus() != null ? row.getReceivedStatus() : "");
                excelRow.createCell(4).setCellValue(row.getFromStore() != null ? row.getFromStore() : "");
                excelRow.createCell(5).setCellValue(row.getToStore() != null ? row.getToStore() : "");
                org.apache.poi.ss.usermodel.Cell qtyCell = excelRow.createCell(6);
                if (row.getTotalQty() != null) qtyCell.setCellValue(row.getTotalQty());
                org.apache.poi.ss.usermodel.Cell amtCell = excelRow.createCell(7);
                if (row.getAmount() != null) {
                    amtCell.setCellValue(row.getAmount());
                    amtCell.setCellStyle(amountStyle);
                }
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
                    COALESCE(s.Category, '') AS shopType,
                    COALESCE(s.status, 0) AS storeStatus,
                    COALESCE(s.info2, '') AS owner,
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
                    s.Category,
                    s.status,
                    s.info2,
                    th.store_code,
                    s.store_name,
                    th.tran_date
                ORDER BY
                    districtName,
                    shopType,
                    storeStatus,
                    owner,
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
            String shopType = row.get("shopType") != null ? row.get("shopType").toString() : "";
            String storeStatus = "";
            Object ssObj = row.get("storeStatus");
            if (ssObj instanceof Boolean b) {
                storeStatus = b ? "ACTIVE" : "INACTIVE";
            } else if (ssObj instanceof Number n) {
                storeStatus = n.intValue() != 0 ? "ACTIVE" : "INACTIVE";
            } else if (ssObj != null) {
                String raw = ssObj.toString().trim();
                if ("1".equals(raw) || "true".equalsIgnoreCase(raw) || "y".equalsIgnoreCase(raw)) storeStatus = "ACTIVE";
                else if ("0".equals(raw) || "false".equalsIgnoreCase(raw) || "n".equalsIgnoreCase(raw)) storeStatus = "INACTIVE";
                else storeStatus = raw;
            }
            String owner = row.get("owner") != null ? row.get("owner").toString() : "";
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
            result.add(new DsrStatusDTO(districtName, shopType, storeStatus, owner, "", storeCode, storeNameVal, date, status));
        }
        return result;
    }

    public List<DsrStatusDTO> getSalesReportAmount(LocalDate startDate, LocalDate endDate, String district, String storeName, String partyName, String saleLedger) {
        String sql = """
                SELECT
                    COALESCE(s.district, '') AS districtName,
                    COALESCE(s.Category, '') AS shopType,
                    COALESCE(s.status, 0) AS storeStatus,
                    th.store_code AS storeCode,
                    COALESCE(s.store_name, th.store_code) AS storeName,
                    th.tran_date AS tranDate,
                    CAST(SUM(COALESCE(th.total_amount, th.sale_amount, 0)) AS DECIMAL(18,2)) AS saleAmount
                FROM tran_head th
                LEFT JOIN store s ON s.store_code = th.store_code
                LEFT JOIN Led_Master party ON party.code = th.party_code
                LEFT JOIN Led_Master saleLed ON saleLed.code = th.sale_led
                WHERE
                    th.status = 'SUBMITTED'
                    AND th.tran_date BETWEEN ? AND ?
                    AND (? IS NULL OR ? = '' OR s.district LIKE ?)
                    AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR th.store_code LIKE ?)
                    AND (? IS NULL OR ? = '' OR party.name LIKE ? OR th.party_code LIKE ?)
                    AND (? IS NULL OR ? = '' OR saleLed.name LIKE ? OR th.sale_led LIKE ?)
                GROUP BY
                    s.district,
                    s.Category,
                    s.status,
                    th.store_code,
                    s.store_name,
                    th.tran_date
                ORDER BY
                    districtName,
                    shopType,
                    storeStatus,
                    storeCode,
                    tranDate
                """;

        String districtLike = "%" + (district != null ? district.trim() : "") + "%";
        String storeLike = "%" + (storeName != null ? storeName.trim() : "") + "%";
        String partyLike = "%" + (partyName != null ? partyName.trim() : "") + "%";
        String saleLedgerLike = "%" + (saleLedger != null ? saleLedger.trim() : "") + "%";

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
                storeLike,
                partyName,
                partyName,
                partyLike,
                partyLike,
                saleLedger,
                saleLedger,
                saleLedgerLike,
                saleLedgerLike
        );

        List<DsrStatusDTO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String districtName = row.get("districtName") != null ? row.get("districtName").toString() : "";
            String shopType = row.get("shopType") != null ? row.get("shopType").toString() : "";
            String storeStatus = "";
            Object ssObj = row.get("storeStatus");
            if (ssObj instanceof Boolean b) {
                storeStatus = b ? "ACTIVE" : "INACTIVE";
            } else if (ssObj instanceof Number n) {
                storeStatus = n.intValue() != 0 ? "ACTIVE" : "INACTIVE";
            } else if (ssObj != null) {
                String raw = ssObj.toString().trim();
                if ("1".equals(raw) || "true".equalsIgnoreCase(raw) || "y".equalsIgnoreCase(raw)) storeStatus = "ACTIVE";
                else if ("0".equals(raw) || "false".equalsIgnoreCase(raw) || "n".equalsIgnoreCase(raw)) storeStatus = "INACTIVE";
                else storeStatus = raw;
            }
            String storeCode = row.get("storeCode") != null ? row.get("storeCode").toString() : "";
            String storeNameVal = row.get("storeName") != null ? row.get("storeName").toString() : "";
            String date = "";
            Object dObj = row.get("tranDate");
            if (dObj instanceof java.sql.Date d) {
                date = d.toLocalDate().toString();
            } else if (dObj != null) {
                date = dObj.toString();
            }
            java.math.BigDecimal amount = java.math.BigDecimal.ZERO;
            Object aObj = row.get("saleAmount");
            if (aObj instanceof java.math.BigDecimal bd) {
                amount = bd;
            } else if (aObj instanceof Number n) {
                amount = java.math.BigDecimal.valueOf(n.doubleValue());
            } else if (aObj != null) {
                try {
                    amount = new java.math.BigDecimal(aObj.toString().trim());
                } catch (Exception ignored) {
                    amount = java.math.BigDecimal.ZERO;
                }
            }
            result.add(new DsrStatusDTO(districtName, shopType, storeStatus, "", "", storeCode, storeNameVal, date, amount));
        }
        return result;
    }

    public List<DsrStatusDTO> getOtherSale(LocalDate startDate, LocalDate endDate, String district, String storeName, String storeCategory, String partyName, String saleLedger) {
        String sql = """
                SELECT
                    COALESCE(s.district, '') AS districtName,
                    COALESCE(s.Category, '') AS shopType,
                    COALESCE(s.status, 0) AS storeStatus,
                    tl.store_code AS storeCode,
                    COALESCE(s.store_name, tl.store_code) AS storeName,
                    tl.tran_date AS tranDate,
                    CAST(SUM(COALESCE(tl.amount, 0)) AS DECIMAL(18,2)) AS saleAmount
                FROM tran_ledgers tl
                LEFT JOIN tran_head th ON th.id = tl.tran_id
                LEFT JOIN store s ON s.store_code = tl.store_code
                LEFT JOIN Led_Master party ON party.code = th.party_code
                LEFT JOIN Led_Master saleLed ON saleLed.code = tl.ledger_code
                WHERE
                    COALESCE(th.status, '') = 'SUBMITTED'
                    AND LTRIM(RTRIM(tl.ledger_code)) = '10716'
                    AND tl.tran_date BETWEEN ? AND ?
                    AND (? IS NULL OR ? = '' OR s.district LIKE ?)
                    AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR tl.store_code LIKE ?)
                    AND (? IS NULL OR ? = '' OR LTRIM(RTRIM(COALESCE(s.Category, ''))) = LTRIM(RTRIM(?)))
                    AND (? IS NULL OR ? = '' OR party.name LIKE ? OR th.party_code LIKE ?)
                    AND (? IS NULL OR ? = '' OR saleLed.name LIKE ? OR tl.ledger_code LIKE ?)
                GROUP BY
                    s.district,
                    s.Category,
                    s.status,
                    tl.store_code,
                    s.store_name,
                    tl.tran_date
                ORDER BY
                    districtName,
                    shopType,
                    storeStatus,
                    storeCode,
                    tranDate
                """;

        String districtLike = "%" + (district != null ? district.trim() : "") + "%";
        String storeLike = "%" + (storeName != null ? storeName.trim() : "") + "%";
        String partyLike = "%" + (partyName != null ? partyName.trim() : "") + "%";
        String saleLedgerLike = "%" + (saleLedger != null ? saleLedger.trim() : "") + "%";

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
                storeLike,
                storeCategory,
                storeCategory,
                storeCategory,
                partyName,
                partyName,
                partyLike,
                partyLike,
                saleLedger,
                saleLedger,
                saleLedgerLike,
                saleLedgerLike
        );

        List<DsrStatusDTO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String districtName = row.get("districtName") != null ? row.get("districtName").toString() : "";
            String shopType = row.get("shopType") != null ? row.get("shopType").toString() : "";
            String storeStatus = "";
            Object ssObj = row.get("storeStatus");
            if (ssObj instanceof Boolean b) {
                storeStatus = b ? "ACTIVE" : "INACTIVE";
            } else if (ssObj instanceof Number n) {
                storeStatus = n.intValue() != 0 ? "ACTIVE" : "INACTIVE";
            } else if (ssObj != null) {
                String raw = ssObj.toString().trim();
                if ("1".equals(raw) || "true".equalsIgnoreCase(raw) || "y".equalsIgnoreCase(raw)) storeStatus = "ACTIVE";
                else if ("0".equals(raw) || "false".equalsIgnoreCase(raw) || "n".equalsIgnoreCase(raw)) storeStatus = "INACTIVE";
                else storeStatus = raw;
            }
            String storeCode = row.get("storeCode") != null ? row.get("storeCode").toString() : "";
            String storeNameVal = row.get("storeName") != null ? row.get("storeName").toString() : "";
            String date = "";
            Object dObj = row.get("tranDate");
            if (dObj instanceof java.sql.Date d) {
                date = d.toLocalDate().toString();
            } else if (dObj != null) {
                date = dObj.toString();
            }
            java.math.BigDecimal amount = java.math.BigDecimal.ZERO;
            Object aObj = row.get("saleAmount");
            if (aObj instanceof java.math.BigDecimal bd) {
                amount = bd;
            } else if (aObj instanceof Number n) {
                amount = java.math.BigDecimal.valueOf(n.doubleValue());
            } else if (aObj != null) {
                try {
                    amount = new java.math.BigDecimal(aObj.toString().trim());
                } catch (Exception ignored) {
                    amount = java.math.BigDecimal.ZERO;
                }
            }
            result.add(new DsrStatusDTO(districtName, shopType, storeStatus, "", "", storeCode, storeNameVal, date, amount));
        }
        return result;
    }

    public List<PriceSegmentReportDTO> getPriceSegmentReport(LocalDate startDate, LocalDate endDate, String district, String storeName, String itemCodesCsv, String sizeCode) {
        String sql = """
                WITH movements AS (
                    SELECT
                        ph.store_code AS storeCode,
                        pi.item_code AS itemCode,
                        pi.size_code AS sizeCode,
                        SUM(COALESCE(pi.quantity, 0)) AS purchaseQty,
                        CAST(0 AS INT) AS transferInQty,
                        CAST(0 AS INT) AS saleQty
                    FROM pur_head ph
                    JOIN pur_item pi ON pi.invoice_no = ph.invoice_no
                    LEFT JOIN store s ON s.store_code = ph.store_code
                    WHERE
                        ph.status = 'SUBMITTED'
                        AND ph.tran_date BETWEEN ? AND ?
                        AND (? IS NULL OR ? = '' OR s.district LIKE ?)
                        AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR ph.store_code LIKE ?)
                        AND (? IS NULL OR ? = '' OR pi.size_code = ?)
                        AND (? IS NULL OR ? = '' OR pi.item_code IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(?, ',')))
                    GROUP BY
                        ph.store_code,
                        pi.item_code,
                        pi.size_code

                    UNION ALL

                    SELECT
                        sh.to_store AS storeCode,
                        si.item_code AS itemCode,
                        si.size_code AS sizeCode,
                        CAST(0 AS INT) AS purchaseQty,
                        SUM(COALESCE(si.quantity, 0)) AS transferInQty,
                        CAST(0 AS INT) AS saleQty
                    FROM sto_head sh
                    JOIN sto_item si ON si.sto_number = sh.sto_number
                    LEFT JOIN store s ON s.store_code = sh.to_store
                    WHERE
                        sh.status = 'SUBMITTED'
                        AND sh.tran_date BETWEEN ? AND ?
                        AND (? IS NULL OR ? = '' OR s.district LIKE ?)
                        AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR sh.to_store LIKE ?)
                        AND (? IS NULL OR ? = '' OR si.size_code = ?)
                        AND (? IS NULL OR ? = '' OR si.item_code IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(?, ',')))
                    GROUP BY
                        sh.to_store,
                        si.item_code,
                        si.size_code

                    UNION ALL

                    SELECT
                        th.store_code AS storeCode,
                        ti.item_code AS itemCode,
                        ti.size_code AS sizeCode,
                        CAST(0 AS INT) AS purchaseQty,
                        CAST(0 AS INT) AS transferInQty,
                        SUM(COALESCE(ti.quantity, 0)) AS saleQty
                    FROM tran_head th
                    JOIN tran_item ti ON ti.invoice_no = th.invoice_no
                    LEFT JOIN store s ON s.store_code = th.store_code
                    WHERE
                        th.status = 'SUBMITTED'
                        AND th.tran_date BETWEEN ? AND ?
                        AND (? IS NULL OR ? = '' OR s.district LIKE ?)
                        AND (? IS NULL OR ? = '' OR s.store_name LIKE ? OR th.store_code LIKE ?)
                        AND (? IS NULL OR ? = '' OR ti.size_code = ?)
                        AND (? IS NULL OR ? = '' OR ti.item_code IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(?, ',')))
                    GROUP BY
                        th.store_code,
                        ti.item_code,
                        ti.size_code
                ),
                agg AS (
                    SELECT
                        storeCode,
                        itemCode,
                        sizeCode,
                        SUM(COALESCE(purchaseQty, 0) + COALESCE(transferInQty, 0)) AS inwardQty,
                        SUM(COALESCE(saleQty, 0)) AS saleQty
                    FROM movements
                    GROUP BY
                        storeCode,
                        itemCode,
                        sizeCode
                ),
                decorated AS (
                    SELECT
                        COALESCE(s.district, '') AS districtName,
                        a.storeCode,
                        COALESCE(s.store_name, a.storeCode) AS storeName,
                        a.itemCode,
                        COALESCE(it.item_name, a.itemCode) AS itemName,
                        a.sizeCode,
                        COALESCE(sz.name, a.sizeCode) AS sizeName,
                        CAST(COALESCE(a.inwardQty, 0) AS INT) AS inwardQty,
                        CAST(COALESCE(a.saleQty, 0) AS INT) AS saleQty,
                        SUM(COALESCE(a.saleQty, 0)) OVER (PARTITION BY a.storeCode) AS storeSaleQty,
                        SUM(COALESCE(a.saleQty, 0)) OVER () AS totalSaleQty
                    FROM agg a
                    LEFT JOIN store s ON s.store_code = a.storeCode
                    LEFT JOIN items it ON it.item_code = a.itemCode
                    LEFT JOIN size sz ON sz.code = a.sizeCode
                    WHERE
                        COALESCE(a.inwardQty, 0) <> 0 OR COALESCE(a.saleQty, 0) <> 0
                )
                SELECT
                    districtName,
                    storeCode,
                    storeName,
                    itemCode,
                    itemName,
                    sizeCode,
                    sizeName,
                    inwardQty,
                    saleQty,
                    CAST(CASE WHEN storeSaleQty = 0 THEN 0 ELSE (CAST(saleQty AS DECIMAL(18, 6)) * 100.0) / storeSaleQty END AS DECIMAL(10, 2)) AS contributionInStore,
                    CAST(CASE WHEN totalSaleQty = 0 THEN 0 ELSE (CAST(saleQty AS DECIMAL(18, 6)) * 100.0) / totalSaleQty END AS DECIMAL(10, 2)) AS contributionInTotal
                FROM decorated
                ORDER BY
                    districtName,
                    storeName,
                    itemName,
                    sizeCode
                """;

        String districtLike = "%" + (district != null ? district.trim() : "") + "%";
        String storeLike = "%" + (storeName != null ? storeName.trim() : "") + "%";
        String itemCsv = itemCodesCsv != null ? itemCodesCsv.trim() : "";
        String sz = sizeCode != null ? sizeCode.trim() : "";

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
                storeLike,
                sz,
                sz,
                sz,
                itemCsv,
                itemCsv,
                itemCsv,

                java.sql.Date.valueOf(startDate),
                java.sql.Date.valueOf(endDate),
                district,
                district,
                districtLike,
                storeName,
                storeName,
                storeLike,
                storeLike,
                sz,
                sz,
                sz,
                itemCsv,
                itemCsv,
                itemCsv,

                java.sql.Date.valueOf(startDate),
                java.sql.Date.valueOf(endDate),
                district,
                district,
                districtLike,
                storeName,
                storeName,
                storeLike,
                storeLike,
                sz,
                sz,
                sz,
                itemCsv,
                itemCsv,
                itemCsv
        );

        List<PriceSegmentReportDTO> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String districtName = row.get("districtName") != null ? row.get("districtName").toString() : "";
            String storeCodeVal = row.get("storeCode") != null ? row.get("storeCode").toString() : "";
            String storeNameVal = row.get("storeName") != null ? row.get("storeName").toString() : "";
            String itemCodeVal = row.get("itemCode") != null ? row.get("itemCode").toString() : "";
            String itemNameVal = row.get("itemName") != null ? row.get("itemName").toString() : "";
            String sizeCodeVal = row.get("sizeCode") != null ? row.get("sizeCode").toString() : "";
            String sizeNameVal = row.get("sizeName") != null ? row.get("sizeName").toString() : "";
            Integer inwardQtyVal = row.get("inwardQty") instanceof Number n ? n.intValue() : 0;
            Integer saleQtyVal = row.get("saleQty") instanceof Number n ? n.intValue() : 0;
            Double contribStore = row.get("contributionInStore") instanceof Number n ? n.doubleValue() : 0.0;
            Double contribTotal = row.get("contributionInTotal") instanceof Number n ? n.doubleValue() : 0.0;

            result.add(new PriceSegmentReportDTO(
                    districtName,
                    storeCodeVal,
                    storeNameVal,
                    itemCodeVal,
                    itemNameVal,
                    sizeCodeVal,
                    sizeNameVal,
                    inwardQtyVal,
                    saleQtyVal,
                    contribStore,
                    contribTotal
            ));
        }
        return result;
    }

    public java.io.ByteArrayInputStream exportPriceSegmentReportToExcel(LocalDate startDate, LocalDate endDate, String district, String storeName, String itemCodesCsv, String sizeCode) throws java.io.IOException {
        List<PriceSegmentReportDTO> rows = getPriceSegmentReport(startDate, endDate, district, storeName, itemCodesCsv, sizeCode);
        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Price Segment Report");

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "DISTRICT", "STORE CODE", "STORE NAME", "ITEM CODE", "ITEM NAME", "SIZE", "INWARD QTY", "SALE QTY", "CONTRIBUTION IN STORE", "CONTRIBUTION IN TOTAL"
            };
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            org.apache.poi.ss.usermodel.CellStyle num2 = workbook.createCellStyle();
            num2.setDataFormat(workbook.createDataFormat().getFormat("0.00"));
            org.apache.poi.ss.usermodel.CellStyle percent2 = workbook.createCellStyle();
            percent2.setDataFormat(workbook.createDataFormat().getFormat("0.00\"%\""));

            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int r = 1;
            for (PriceSegmentReportDTO row : rows) {
                org.apache.poi.ss.usermodel.Row excelRow = sheet.createRow(r++);
                excelRow.createCell(0).setCellValue(row.getDistrictName() != null ? row.getDistrictName() : "");
                excelRow.createCell(1).setCellValue(row.getStoreCode() != null ? row.getStoreCode() : "");
                excelRow.createCell(2).setCellValue(row.getStoreName() != null ? row.getStoreName() : "");
                excelRow.createCell(3).setCellValue(row.getItemCode() != null ? row.getItemCode() : "");
                excelRow.createCell(4).setCellValue(row.getItemName() != null ? row.getItemName() : "");
                excelRow.createCell(5).setCellValue(row.getSizeName() != null ? row.getSizeName() : "");

                org.apache.poi.ss.usermodel.Cell inwardCell = excelRow.createCell(6);
                if (row.getInwardQty() != null) inwardCell.setCellValue(row.getInwardQty());

                org.apache.poi.ss.usermodel.Cell saleCell = excelRow.createCell(7);
                if (row.getSaleQty() != null) saleCell.setCellValue(row.getSaleQty());

                org.apache.poi.ss.usermodel.Cell cStoreCell = excelRow.createCell(8);
                if (row.getContributionInStore() != null) {
                    cStoreCell.setCellValue(row.getContributionInStore());
                    cStoreCell.setCellStyle(percent2);
                }

                org.apache.poi.ss.usermodel.Cell cTotalCell = excelRow.createCell(9);
                if (row.getContributionInTotal() != null) {
                    cTotalCell.setCellValue(row.getContributionInTotal());
                    cTotalCell.setCellStyle(percent2);
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return new java.io.ByteArrayInputStream(out.toByteArray());
        }
    }

    public java.io.ByteArrayInputStream exportPriceSegmentReportViewToExcel(PriceSegmentExportRequestDTO request) throws java.io.IOException {
        List<String> columns = request != null ? request.getColumns() : null;
        List<PriceSegmentExportRowDTO> rows = request != null ? request.getRows() : null;
        List<String> cols = columns != null ? columns : java.util.List.of("districtName", "inwardQty", "saleQty", "contributionInTotal");
        List<PriceSegmentExportRowDTO> data = rows != null ? rows : java.util.List.of();

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Price Segment Report");

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            org.apache.poi.ss.usermodel.CellStyle number2 = workbook.createCellStyle();
            number2.setDataFormat(workbook.createDataFormat().getFormat("0.00"));

            org.apache.poi.ss.usermodel.CellStyle percent2 = workbook.createCellStyle();
            percent2.setDataFormat(workbook.createDataFormat().getFormat("0.00\"%\""));

            org.apache.poi.ss.usermodel.Font districtFont = workbook.createFont();
            districtFont.setBold(true);

            org.apache.poi.ss.usermodel.CellStyle districtTextStyle = workbook.createCellStyle();
            districtTextStyle.setFont(districtFont);
            districtTextStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            districtTextStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle districtNumber2 = workbook.createCellStyle();
            districtNumber2.cloneStyleFrom(number2);
            districtNumber2.setFont(districtFont);
            districtNumber2.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            districtNumber2.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle districtPercent2 = workbook.createCellStyle();
            districtPercent2.cloneStyleFrom(percent2);
            districtPercent2.setFont(districtFont);
            districtPercent2.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            districtPercent2.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            java.util.Map<String, String> labelByKey = new java.util.HashMap<>();
            labelByKey.put("districtName", "DISTRICT");
            labelByKey.put("storeName", "STORE NAME");
            labelByKey.put("itemName", "ITEM NAME");
            labelByKey.put("sizeName", "SIZE NAME");
            labelByKey.put("inwardQty", "INWARD QTY");
            labelByKey.put("saleQty", "SALE QTY");
            labelByKey.put("contributionInDistrict", "CONTRIBUTION IN DISTRICT");
            labelByKey.put("contributionInStore", "CONTRIBUTION IN STORE");
            labelByKey.put("contributionInTotal", "CONTRIBUTION IN TOTAL");

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            for (int i = 0; i < cols.size(); i++) {
                String key = String.valueOf(cols.get(i));
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(labelByKey.getOrDefault(key, key));
                cell.setCellStyle(headerStyle);
            }

            int r = 1;
            for (PriceSegmentExportRowDTO row : data) {
                String rt = row != null ? String.valueOf(row.getRowType()) : "";
                boolean isDistrict = "district".equalsIgnoreCase(rt) || "grand".equalsIgnoreCase(rt);
                org.apache.poi.ss.usermodel.Row excelRow = sheet.createRow(r++);
                for (int c = 0; c < cols.size(); c++) {
                    String key = String.valueOf(cols.get(c));
                    org.apache.poi.ss.usermodel.Cell cell = excelRow.createCell(c);

                    if ("districtName".equals(key)) {
                        cell.setCellValue(row != null && row.getDistrictName() != null ? row.getDistrictName() : "");
                        if (isDistrict) cell.setCellStyle(districtTextStyle);
                    } else if ("storeName".equals(key)) {
                        cell.setCellValue(row != null && row.getStoreName() != null ? row.getStoreName() : "");
                        if (isDistrict) cell.setCellStyle(districtTextStyle);
                    } else if ("itemName".equals(key)) {
                        cell.setCellValue(row != null && row.getItemName() != null ? row.getItemName() : "");
                        if (isDistrict) cell.setCellStyle(districtTextStyle);
                    } else if ("sizeName".equals(key)) {
                        cell.setCellValue(row != null && row.getSizeName() != null ? row.getSizeName() : "");
                        if (isDistrict) cell.setCellStyle(districtTextStyle);
                    } else if ("inwardQty".equals(key)) {
                        if (row != null && row.getInwardQty() != null) cell.setCellValue(row.getInwardQty().doubleValue());
                        cell.setCellStyle(isDistrict ? districtNumber2 : number2);
                    } else if ("saleQty".equals(key)) {
                        if (row != null && row.getSaleQty() != null) cell.setCellValue(row.getSaleQty().doubleValue());
                        cell.setCellStyle(isDistrict ? districtNumber2 : number2);
                    } else if ("contributionInDistrict".equals(key)) {
                        if (row != null && row.getContributionInDistrict() != null) cell.setCellValue(row.getContributionInDistrict());
                        cell.setCellStyle(isDistrict ? districtPercent2 : percent2);
                    } else if ("contributionInStore".equals(key)) {
                        if (row != null && row.getContributionInStore() != null) cell.setCellValue(row.getContributionInStore());
                        cell.setCellStyle(isDistrict ? districtPercent2 : percent2);
                    } else if ("contributionInTotal".equals(key)) {
                        if (row != null && row.getContributionInTotal() != null) cell.setCellValue(row.getContributionInTotal());
                        cell.setCellStyle(isDistrict ? districtPercent2 : percent2);
                    } else {
                        cell.setCellValue("");
                    }
                }
            }

            for (int i = 0; i < cols.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return new java.io.ByteArrayInputStream(out.toByteArray());
        }
    }

    public List<String> getDsrVoucherNos(String storeCode, LocalDate date) {
        String sc = storeCode != null ? storeCode.trim() : "";
        if (sc.isBlank() || date == null) {
            return new ArrayList<>();
        }

        String sql = """
                SELECT DISTINCT th.invoice_no AS invoiceNo
                FROM tran_head th
                WHERE
                    th.status = 'SUBMITTED'
                    AND th.store_code = ?
                    AND th.tran_date = ?
                ORDER BY th.invoice_no
                """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                sql,
                sc,
                java.sql.Date.valueOf(date)
        );

        List<String> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Object v = row.get("invoiceNo");
            if (v == null) continue;
            String s = v.toString().trim();
            if (!s.isBlank()) out.add(s);
        }
        return out;
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
            String shopType = safe(r.getShopType());
            String storeStatus = safe(r.getStoreStatus());
            String owner = safe(r.getOwner());
            String storeCode = safe(r.getStoreCode());
            String storeNameVal = safe(r.getStoreName());
            String dateStr = safe(r.getDate());
            int status = r.getStatus() != null ? r.getStatus() : 0;

            if (storeCode.isBlank() || dateStr.isBlank()) continue;
            String key = districtName + "||" + shopType + "||" + storeStatus + "||" + owner + "||" + storeCode + "||" + storeNameVal;
            DsrStatusPivotRow row = pivot.computeIfAbsent(key, k -> {
                DsrStatusPivotRow pr = new DsrStatusPivotRow();
                pr.districtName = districtName;
                pr.shopType = shopType;
                pr.storeStatus = storeStatus;
                pr.owner = owner;
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
            c = safe(a.shopType).compareTo(safe(b.shopType));
            if (c != 0) return c;
            c = safe(a.storeStatus).compareTo(safe(b.storeStatus));
            if (c != 0) return c;
            c = safe(a.owner).compareTo(safe(b.owner));
            if (c != 0) return c;
            c = safe(a.storeCode).compareTo(safe(b.storeCode));
            if (c != 0) return c;
            return safe(a.storeName).compareTo(safe(b.storeName));
        });
        List<DsrStatusPivotRow> exportRows = buildDsrStatusExportRows(rows, dateRange);

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
            headerStyle.setWrapText(true);

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

            org.apache.poi.ss.usermodel.CellStyle districtTotalStyle = workbook.createCellStyle();
            districtTotalStyle.cloneStyleFrom(textStyle);
            districtTotalStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            districtTotalStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            org.apache.poi.ss.usermodel.Font districtTotalFont = workbook.createFont();
            districtTotalFont.setBold(true);
            districtTotalStyle.setFont(districtTotalFont);

            org.apache.poi.ss.usermodel.CellStyle districtTotalCenterStyle = workbook.createCellStyle();
            districtTotalCenterStyle.cloneStyleFrom(districtTotalStyle);
            districtTotalCenterStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);

            org.apache.poi.ss.usermodel.CellStyle grandTotalStyle = workbook.createCellStyle();
            grandTotalStyle.cloneStyleFrom(textStyle);
            grandTotalStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
            grandTotalStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            org.apache.poi.ss.usermodel.Font grandTotalFont = workbook.createFont();
            grandTotalFont.setBold(true);
            grandTotalStyle.setFont(grandTotalFont);

            org.apache.poi.ss.usermodel.CellStyle grandTotalCenterStyle = workbook.createCellStyle();
            grandTotalCenterStyle.cloneStyleFrom(grandTotalStyle);
            grandTotalCenterStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);

            org.apache.poi.ss.usermodel.CellStyle blankCenterStyle = workbook.createCellStyle();
            blankCenterStyle.cloneStyleFrom(centerStyle);
            blankCenterStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankCenterStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle blankDistrictTotalCenterStyle = workbook.createCellStyle();
            blankDistrictTotalCenterStyle.cloneStyleFrom(districtTotalCenterStyle);
            blankDistrictTotalCenterStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankDistrictTotalCenterStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle blankGrandTotalCenterStyle = workbook.createCellStyle();
            blankGrandTotalCenterStyle.cloneStyleFrom(grandTotalCenterStyle);
            blankGrandTotalCenterStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankGrandTotalCenterStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            int totalCols = 7 + dateRange.size();

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
            String[] fixedHeaders = new String[]{"S.NO", "DISTRICT NAME", "STORE CODE", "STORE NAME", "CATEGORY", "STATUS", "OWNER"};
            for (String h : fixedHeaders) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(h);
                cell.setCellStyle(headerStyle);
            }
            for (LocalDate d : dateRange) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(d.getDayOfMonth() + "\n" + dayShortLabel(d));
                cell.setCellStyle(headerStyle);
            }

            int rIdx = 3;
            int serialNo = 0;
            for (DsrStatusPivotRow r : exportRows) {
                boolean districtTotalRow = "districtTotal".equals(r.rowType);
                boolean grandTotalRow = "grandTotal".equals(r.rowType);
                org.apache.poi.ss.usermodel.CellStyle rowTextStyle = grandTotalRow ? grandTotalStyle : districtTotalRow ? districtTotalStyle : textStyle;
                org.apache.poi.ss.usermodel.CellStyle rowCenterStyle = grandTotalRow ? grandTotalCenterStyle : districtTotalRow ? districtTotalCenterStyle : centerStyle;
                org.apache.poi.ss.usermodel.CellStyle rowBlankCenterStyle = grandTotalRow ? blankGrandTotalCenterStyle : districtTotalRow ? blankDistrictTotalCenterStyle : blankCenterStyle;
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                int col = 0;

                org.apache.poi.ss.usermodel.Cell cellSno = row.createCell(col++);
                if ("data".equals(r.rowType)) cellSno.setCellValue(++serialNo);
                else cellSno.setCellValue("");
                cellSno.setCellStyle(rowCenterStyle);
                cellSno.setCellStyle(rowCenterStyle);
                cellSno.setCellStyle(rowCenterStyle);

                org.apache.poi.ss.usermodel.Cell cell0 = row.createCell(col++);
                cell0.setCellValue(grandTotalRow ? "" : safe(r.districtName));
                cell0.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell1 = row.createCell(col++);
                cell1.setCellValue("data".equals(r.rowType) ? safe(r.storeCode) : "");
                cell1.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell2 = row.createCell(col++);
                cell2.setCellValue(safe(r.storeName));
                cell2.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell3 = row.createCell(col++);
                cell3.setCellValue("data".equals(r.rowType) ? safe(r.shopType) : "");
                cell3.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell4 = row.createCell(col++);
                cell4.setCellValue("data".equals(r.rowType) ? safe(r.storeStatus) : "");
                cell4.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell5 = row.createCell(col++);
                cell5.setCellValue("data".equals(r.rowType) ? safe(r.owner) : "");
                cell5.setCellStyle(rowTextStyle);

                for (LocalDate d : dateRange) {
                    String iso = d.toString();
                    Integer v = r.byDate.getOrDefault(iso, 0);
                    org.apache.poi.ss.usermodel.Cell cell = row.createCell(col++);
                    if (v != null && v > 0) {
                        cell.setCellValue(v);
                        cell.setCellStyle(rowCenterStyle);
                    } else {
                        cell.setCellValue("");
                        cell.setCellStyle(rowBlankCenterStyle);
                    }
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

    public java.io.ByteArrayInputStream exportSalesReportAmountToExcel(LocalDate startDate, LocalDate endDate, String district, String storeName, String partyName, String saleLedger) throws java.io.IOException {
        List<DsrStatusDTO> data = getSalesReportAmount(startDate, endDate, district, storeName, partyName, saleLedger);

        List<LocalDate> dateRange = new ArrayList<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            dateRange.add(cur);
            cur = cur.plusDays(1);
        }

        Map<String, SalesAmountPivotRow> pivot = new java.util.LinkedHashMap<>();
        for (DsrStatusDTO r : data) {
            String districtName = safe(r.getDistrictName());
            String shopType = safe(r.getShopType());
            String storeStatus = safe(r.getStoreStatus());
            String storeCode = safe(r.getStoreCode());
            String storeNameVal = safe(r.getStoreName());
            String dateStr = safe(r.getDate());
            java.math.BigDecimal amount = r.getSaleAmount() != null ? r.getSaleAmount() : java.math.BigDecimal.ZERO;

            if (storeCode.isBlank() || dateStr.isBlank()) continue;
            String key = districtName + "||" + shopType + "||" + storeStatus + "||" + storeCode + "||" + storeNameVal;
            SalesAmountPivotRow row = pivot.computeIfAbsent(key, k -> {
                SalesAmountPivotRow pr = new SalesAmountPivotRow();
                pr.districtName = districtName;
                pr.shopType = shopType;
                pr.storeStatus = storeStatus;
                pr.storeCode = storeCode;
                pr.storeName = storeNameVal;
                pr.byDate = new HashMap<>();
                return pr;
            });
            row.byDate.put(dateStr, row.byDate.getOrDefault(dateStr, java.math.BigDecimal.ZERO).add(amount));
        }

        List<SalesAmountPivotRow> rows = new ArrayList<>(pivot.values());
        rows.sort((a, b) -> {
            int c = safe(a.districtName).compareTo(safe(b.districtName));
            if (c != 0) return c;
            c = safe(a.shopType).compareTo(safe(b.shopType));
            if (c != 0) return c;
            c = safe(a.storeStatus).compareTo(safe(b.storeStatus));
            if (c != 0) return c;
            c = safe(a.storeCode).compareTo(safe(b.storeCode));
            if (c != 0) return c;
            return safe(a.storeName).compareTo(safe(b.storeName));
        });
        List<SalesAmountPivotRow> exportRows = buildSalesAmountExportRows(rows, dateRange);

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Sales Amount");

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
            headerStyle.setWrapText(true);

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
            org.apache.poi.ss.usermodel.DataFormat df = workbook.createDataFormat();
            numberStyle.setDataFormat(df.getFormat("#,##0.00"));

            org.apache.poi.ss.usermodel.CellStyle districtTotalTextStyle = workbook.createCellStyle();
            districtTotalTextStyle.cloneStyleFrom(textStyle);
            districtTotalTextStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            districtTotalTextStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            org.apache.poi.ss.usermodel.Font districtTotalTextFont = workbook.createFont();
            districtTotalTextFont.setBold(true);
            districtTotalTextStyle.setFont(districtTotalTextFont);

            org.apache.poi.ss.usermodel.CellStyle districtTotalNumberStyle = workbook.createCellStyle();
            districtTotalNumberStyle.cloneStyleFrom(numberStyle);
            districtTotalNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            districtTotalNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            districtTotalNumberStyle.setFont(districtTotalTextFont);

            org.apache.poi.ss.usermodel.CellStyle grandTotalTextStyle = workbook.createCellStyle();
            grandTotalTextStyle.cloneStyleFrom(textStyle);
            grandTotalTextStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
            grandTotalTextStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            org.apache.poi.ss.usermodel.Font grandTotalTextFont = workbook.createFont();
            grandTotalTextFont.setBold(true);
            grandTotalTextStyle.setFont(grandTotalTextFont);

            org.apache.poi.ss.usermodel.CellStyle grandTotalNumberStyle = workbook.createCellStyle();
            grandTotalNumberStyle.cloneStyleFrom(numberStyle);
            grandTotalNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
            grandTotalNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            grandTotalNumberStyle.setFont(grandTotalTextFont);

            org.apache.poi.ss.usermodel.CellStyle blankNumberStyle = workbook.createCellStyle();
            blankNumberStyle.cloneStyleFrom(numberStyle);
            blankNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle blankDistrictTotalNumberStyle = workbook.createCellStyle();
            blankDistrictTotalNumberStyle.cloneStyleFrom(districtTotalNumberStyle);
            blankDistrictTotalNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankDistrictTotalNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle blankGrandTotalNumberStyle = workbook.createCellStyle();
            blankGrandTotalNumberStyle.cloneStyleFrom(grandTotalNumberStyle);
            blankGrandTotalNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankGrandTotalNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            int totalCols = 8 + dateRange.size();

            org.apache.poi.ss.usermodel.Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(26);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Sales Report (Amount) (" + startDate + " to " + endDate + ")");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, totalCols - 1));

            org.apache.poi.ss.usermodel.Row filterRow = sheet.createRow(1);
            org.apache.poi.ss.usermodel.Cell filterCell = filterRow.createCell(0);
            filterCell.setCellValue("District: " + safe(district) + " | Store: " + safe(storeName) + " | Party: " + safe(partyName) + " | Sale Ledger: " + safe(saleLedger));
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(1, 1, 0, totalCols - 1));

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(2);
            int c = 0;
            String[] fixedHeaders = new String[]{"S.NO", "DISTRICT NAME", "STORE CODE", "STORE NAME", "CATEGORY", "STATUS"};
            for (String h : fixedHeaders) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(h);
                cell.setCellStyle(headerStyle);
            }
            for (LocalDate d : dateRange) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(d.getDayOfMonth() + "\n" + dayShortLabel(d));
                cell.setCellStyle(headerStyle);
            }
            org.apache.poi.ss.usermodel.Cell totalHeaderCell = headerRow.createCell(c++);
            totalHeaderCell.setCellValue("TOTAL");
            totalHeaderCell.setCellStyle(headerStyle);
            org.apache.poi.ss.usermodel.Cell avgHeaderCell = headerRow.createCell(c++);
            avgHeaderCell.setCellValue("AVERAGE SALE");
            avgHeaderCell.setCellStyle(headerStyle);

            int rIdx = 3;
            int serialNo = 0;
            for (SalesAmountPivotRow r : exportRows) {
                boolean districtTotalRow = "districtTotal".equals(r.rowType);
                boolean grandTotalRow = "grandTotal".equals(r.rowType);
                org.apache.poi.ss.usermodel.CellStyle rowTextStyle = grandTotalRow ? grandTotalTextStyle : districtTotalRow ? districtTotalTextStyle : textStyle;
                org.apache.poi.ss.usermodel.CellStyle rowNumberStyle = grandTotalRow ? grandTotalNumberStyle : districtTotalRow ? districtTotalNumberStyle : numberStyle;
                org.apache.poi.ss.usermodel.CellStyle rowBlankNumberStyle = grandTotalRow ? blankGrandTotalNumberStyle : districtTotalRow ? blankDistrictTotalNumberStyle : blankNumberStyle;
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                int col = 0;

                org.apache.poi.ss.usermodel.Cell cellSno = row.createCell(col++);
                if ("data".equals(r.rowType)) cellSno.setCellValue(++serialNo);
                else cellSno.setCellValue("");
                cellSno.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell0 = row.createCell(col++);
                cell0.setCellValue(grandTotalRow ? "" : safe(r.districtName));
                cell0.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell1 = row.createCell(col++);
                cell1.setCellValue("data".equals(r.rowType) ? safe(r.storeCode) : "");
                cell1.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell2 = row.createCell(col++);
                cell2.setCellValue(safe(r.storeName));
                cell2.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell3 = row.createCell(col++);
                cell3.setCellValue("data".equals(r.rowType) ? safe(r.shopType) : "");
                cell3.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell4 = row.createCell(col++);
                cell4.setCellValue("data".equals(r.rowType) ? safe(r.storeStatus) : "");
                cell4.setCellStyle(rowTextStyle);

                for (LocalDate d : dateRange) {
                    String iso = d.toString();
                    java.math.BigDecimal v = r.byDate.getOrDefault(iso, java.math.BigDecimal.ZERO);
                    org.apache.poi.ss.usermodel.Cell cell = row.createCell(col++);
                    if (v != null && v.compareTo(java.math.BigDecimal.ZERO) != 0) {
                        cell.setCellValue(v.doubleValue());
                        cell.setCellStyle(rowNumberStyle);
                    } else {
                        cell.setCellValue("");
                        cell.setCellStyle(rowBlankNumberStyle);
                    }
                }

                org.apache.poi.ss.usermodel.Cell totalCell = row.createCell(col++);
                java.math.BigDecimal totalV = r.totalSale != null ? r.totalSale : java.math.BigDecimal.ZERO;
                if (totalV.compareTo(java.math.BigDecimal.ZERO) != 0) {
                    totalCell.setCellValue(totalV.doubleValue());
                    totalCell.setCellStyle(rowNumberStyle);
                } else {
                    totalCell.setCellValue("");
                    totalCell.setCellStyle(rowBlankNumberStyle);
                }

                org.apache.poi.ss.usermodel.Cell avgCell = row.createCell(col++);
                java.math.BigDecimal avgV = r.averageSale != null ? r.averageSale : java.math.BigDecimal.ZERO;
                if (avgV.compareTo(java.math.BigDecimal.ZERO) != 0) {
                    avgCell.setCellValue(avgV.doubleValue());
                    avgCell.setCellStyle(rowNumberStyle);
                } else {
                    avgCell.setCellValue("");
                    avgCell.setCellStyle(rowBlankNumberStyle);
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

    public java.io.ByteArrayInputStream exportOtherSaleToExcel(LocalDate startDate, LocalDate endDate, String district, String storeName, String storeCategory, String partyName, String saleLedger) throws java.io.IOException {
        List<DsrStatusDTO> data = getOtherSale(startDate, endDate, district, storeName, storeCategory, partyName, saleLedger);

        List<LocalDate> dateRange = new ArrayList<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            dateRange.add(cur);
            cur = cur.plusDays(1);
        }

        Map<String, SalesAmountPivotRow> pivot = new java.util.LinkedHashMap<>();
        for (DsrStatusDTO r : data) {
            String districtName = safe(r.getDistrictName());
            String shopType = safe(r.getShopType());
            String storeStatus = safe(r.getStoreStatus());
            String storeCode = safe(r.getStoreCode());
            String storeNameVal = safe(r.getStoreName());
            String dateStr = safe(r.getDate());
            java.math.BigDecimal amount = r.getSaleAmount() != null ? r.getSaleAmount() : java.math.BigDecimal.ZERO;

            if (storeCode.isBlank() || dateStr.isBlank()) continue;
            String key = districtName + "||" + shopType + "||" + storeStatus + "||" + storeCode + "||" + storeNameVal;
            SalesAmountPivotRow row = pivot.computeIfAbsent(key, k -> {
                SalesAmountPivotRow pr = new SalesAmountPivotRow();
                pr.districtName = districtName;
                pr.shopType = shopType;
                pr.storeStatus = storeStatus;
                pr.storeCode = storeCode;
                pr.storeName = storeNameVal;
                pr.byDate = new HashMap<>();
                return pr;
            });
            row.byDate.put(dateStr, row.byDate.getOrDefault(dateStr, java.math.BigDecimal.ZERO).add(amount));
        }

        List<SalesAmountPivotRow> rows = new ArrayList<>(pivot.values());
        rows.sort((a, b) -> {
            int c = safe(a.districtName).compareTo(safe(b.districtName));
            if (c != 0) return c;
            c = safe(a.shopType).compareTo(safe(b.shopType));
            if (c != 0) return c;
            c = safe(a.storeStatus).compareTo(safe(b.storeStatus));
            if (c != 0) return c;
            c = safe(a.storeCode).compareTo(safe(b.storeCode));
            if (c != 0) return c;
            return safe(a.storeName).compareTo(safe(b.storeName));
        });
        List<SalesAmountPivotRow> exportRows = buildSalesAmountExportRows(rows, dateRange);

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Other Sale");

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
            headerStyle.setWrapText(true);

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
            org.apache.poi.ss.usermodel.DataFormat df = workbook.createDataFormat();
            numberStyle.setDataFormat(df.getFormat("#,##0.00"));

            org.apache.poi.ss.usermodel.CellStyle districtTotalTextStyle = workbook.createCellStyle();
            districtTotalTextStyle.cloneStyleFrom(textStyle);
            districtTotalTextStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            districtTotalTextStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            org.apache.poi.ss.usermodel.Font districtTotalTextFont = workbook.createFont();
            districtTotalTextFont.setBold(true);
            districtTotalTextStyle.setFont(districtTotalTextFont);

            org.apache.poi.ss.usermodel.CellStyle districtTotalNumberStyle = workbook.createCellStyle();
            districtTotalNumberStyle.cloneStyleFrom(numberStyle);
            districtTotalNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
            districtTotalNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            districtTotalNumberStyle.setFont(districtTotalTextFont);

            org.apache.poi.ss.usermodel.CellStyle grandTotalTextStyle = workbook.createCellStyle();
            grandTotalTextStyle.cloneStyleFrom(textStyle);
            grandTotalTextStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
            grandTotalTextStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            org.apache.poi.ss.usermodel.Font grandTotalTextFont = workbook.createFont();
            grandTotalTextFont.setBold(true);
            grandTotalTextStyle.setFont(grandTotalTextFont);

            org.apache.poi.ss.usermodel.CellStyle grandTotalNumberStyle = workbook.createCellStyle();
            grandTotalNumberStyle.cloneStyleFrom(numberStyle);
            grandTotalNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_40_PERCENT.getIndex());
            grandTotalNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            grandTotalNumberStyle.setFont(grandTotalTextFont);

            org.apache.poi.ss.usermodel.CellStyle blankNumberStyle = workbook.createCellStyle();
            blankNumberStyle.cloneStyleFrom(numberStyle);
            blankNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle blankDistrictTotalNumberStyle = workbook.createCellStyle();
            blankDistrictTotalNumberStyle.cloneStyleFrom(districtTotalNumberStyle);
            blankDistrictTotalNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankDistrictTotalNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            org.apache.poi.ss.usermodel.CellStyle blankGrandTotalNumberStyle = workbook.createCellStyle();
            blankGrandTotalNumberStyle.cloneStyleFrom(grandTotalNumberStyle);
            blankGrandTotalNumberStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROSE.getIndex());
            blankGrandTotalNumberStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            int totalCols = 8 + dateRange.size();

            org.apache.poi.ss.usermodel.Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(26);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Other Sale (" + startDate + " to " + endDate + ")");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, totalCols - 1));

            org.apache.poi.ss.usermodel.Row filterRow = sheet.createRow(1);
            org.apache.poi.ss.usermodel.Cell filterCell = filterRow.createCell(0);
            filterCell.setCellValue("District: " + safe(district) + " | Store: " + safe(storeName) + " | Category: " + safe(storeCategory) + " | Party: " + safe(partyName) + " | Sale Ledger: " + safe(saleLedger));
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(1, 1, 0, totalCols - 1));

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(2);
            int c = 0;
            String[] fixedHeaders = new String[]{"S.NO", "DISTRICT NAME", "STORE CODE", "STORE NAME", "CATEGORY", "STATUS"};
            for (String h : fixedHeaders) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(h);
                cell.setCellStyle(headerStyle);
            }
            for (LocalDate d : dateRange) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(c++);
                cell.setCellValue(d.getDayOfMonth() + "\n" + dayShortLabel(d));
                cell.setCellStyle(headerStyle);
            }
            org.apache.poi.ss.usermodel.Cell totalHeaderCell = headerRow.createCell(c++);
            totalHeaderCell.setCellValue("TOTAL");
            totalHeaderCell.setCellStyle(headerStyle);
            org.apache.poi.ss.usermodel.Cell avgHeaderCell = headerRow.createCell(c++);
            avgHeaderCell.setCellValue("AVERAGE OTHER SALE");
            avgHeaderCell.setCellStyle(headerStyle);

            int rIdx = 3;
            int serialNo = 0;
            for (SalesAmountPivotRow r : exportRows) {
                boolean districtTotalRow = "districtTotal".equals(r.rowType);
                boolean grandTotalRow = "grandTotal".equals(r.rowType);
                org.apache.poi.ss.usermodel.CellStyle rowTextStyle = grandTotalRow ? grandTotalTextStyle : districtTotalRow ? districtTotalTextStyle : textStyle;
                org.apache.poi.ss.usermodel.CellStyle rowNumberStyle = grandTotalRow ? grandTotalNumberStyle : districtTotalRow ? districtTotalNumberStyle : numberStyle;
                org.apache.poi.ss.usermodel.CellStyle rowBlankNumberStyle = grandTotalRow ? blankGrandTotalNumberStyle : districtTotalRow ? blankDistrictTotalNumberStyle : blankNumberStyle;
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                int col = 0;

                org.apache.poi.ss.usermodel.Cell cellSno = row.createCell(col++);
                if ("data".equals(r.rowType)) cellSno.setCellValue(++serialNo);
                else cellSno.setCellValue("");
                cellSno.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell0 = row.createCell(col++);
                cell0.setCellValue(grandTotalRow ? "" : safe(r.districtName));
                cell0.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell1 = row.createCell(col++);
                cell1.setCellValue("data".equals(r.rowType) ? safe(r.storeCode) : "");
                cell1.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell2 = row.createCell(col++);
                cell2.setCellValue(safe(r.storeName));
                cell2.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell3 = row.createCell(col++);
                cell3.setCellValue("data".equals(r.rowType) ? safe(r.shopType) : "");
                cell3.setCellStyle(rowTextStyle);

                org.apache.poi.ss.usermodel.Cell cell4 = row.createCell(col++);
                cell4.setCellValue("data".equals(r.rowType) ? safe(r.storeStatus) : "");
                cell4.setCellStyle(rowTextStyle);

                for (LocalDate d : dateRange) {
                    String iso = d.toString();
                    java.math.BigDecimal v = r.byDate.getOrDefault(iso, java.math.BigDecimal.ZERO);
                    org.apache.poi.ss.usermodel.Cell cell = row.createCell(col++);
                    if (v != null && v.compareTo(java.math.BigDecimal.ZERO) != 0) {
                        cell.setCellValue(v.doubleValue());
                        cell.setCellStyle(rowNumberStyle);
                    } else {
                        cell.setCellValue("");
                        cell.setCellStyle(rowBlankNumberStyle);
                    }
                }

                org.apache.poi.ss.usermodel.Cell totalCell = row.createCell(col++);
                java.math.BigDecimal totalV = r.totalSale != null ? r.totalSale : java.math.BigDecimal.ZERO;
                if (totalV.compareTo(java.math.BigDecimal.ZERO) != 0) {
                    totalCell.setCellValue(totalV.doubleValue());
                    totalCell.setCellStyle(rowNumberStyle);
                } else {
                    totalCell.setCellValue("");
                    totalCell.setCellStyle(rowBlankNumberStyle);
                }

                org.apache.poi.ss.usermodel.Cell avgCell = row.createCell(col++);
                java.math.BigDecimal avgV = r.averageSale != null ? r.averageSale : java.math.BigDecimal.ZERO;
                if (avgV.compareTo(java.math.BigDecimal.ZERO) != 0) {
                    avgCell.setCellValue(avgV.doubleValue());
                    avgCell.setCellStyle(rowNumberStyle);
                } else {
                    avgCell.setCellValue("");
                    avgCell.setCellStyle(rowBlankNumberStyle);
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

    private static String dayShortLabel(LocalDate date) {
        if (date == null) return "";
        return date.getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH).toUpperCase(java.util.Locale.ENGLISH);
    }

    private static List<DsrStatusPivotRow> buildDsrStatusExportRows(List<DsrStatusPivotRow> rows, List<LocalDate> dateRange) {
        List<DsrStatusPivotRow> exportRows = new ArrayList<>();
        if (rows == null || rows.isEmpty()) return exportRows;

        String currentDistrict = null;
        List<DsrStatusPivotRow> districtRows = new ArrayList<>();
        for (DsrStatusPivotRow row : rows) {
            if (currentDistrict != null && !safe(currentDistrict).equals(safe(row.districtName))) {
                exportRows.add(buildDsrStatusSummaryRow("districtTotal", currentDistrict, "District Total", districtRows, dateRange));
                districtRows = new ArrayList<>();
            }
            currentDistrict = row.districtName;
            row.rowType = "data";
            districtRows.add(row);
            exportRows.add(row);
        }
        if (!districtRows.isEmpty()) {
            exportRows.add(buildDsrStatusSummaryRow("districtTotal", currentDistrict, "District Total", districtRows, dateRange));
        }
        exportRows.add(buildDsrStatusSummaryRow("grandTotal", "", "Grand Total", rows, dateRange));
        return exportRows;
    }

    private static DsrStatusPivotRow buildDsrStatusSummaryRow(String rowType, String districtName, String storeName, List<DsrStatusPivotRow> rows, List<LocalDate> dateRange) {
        DsrStatusPivotRow summary = new DsrStatusPivotRow();
        summary.rowType = rowType;
        summary.districtName = safe(districtName);
        summary.storeName = safe(storeName);
        summary.byDate = new HashMap<>();
        for (LocalDate date : dateRange) {
            String iso = date.toString();
            int total = 0;
            for (DsrStatusPivotRow row : rows) {
                total += row.byDate != null ? row.byDate.getOrDefault(iso, 0) : 0;
            }
            summary.byDate.put(iso, total);
        }
        return summary;
    }

    private static List<SalesAmountPivotRow> buildSalesAmountExportRows(List<SalesAmountPivotRow> rows, List<LocalDate> dateRange) {
        List<SalesAmountPivotRow> exportRows = new ArrayList<>();
        if (rows == null || rows.isEmpty()) return exportRows;

        String currentDistrict = null;
        List<SalesAmountPivotRow> districtRows = new ArrayList<>();
        for (SalesAmountPivotRow row : rows) {
            row.rowType = "data";
            row.totalSale = calculateSalesAmountTotal(row, dateRange);
            row.averageSale = calculateSalesAmountAverage(row, dateRange);
            if (currentDistrict != null && !safe(currentDistrict).equals(safe(row.districtName))) {
                exportRows.add(buildSalesAmountSummaryRow("districtTotal", currentDistrict, "District Total", districtRows, dateRange));
                districtRows = new ArrayList<>();
            }
            currentDistrict = row.districtName;
            districtRows.add(row);
            exportRows.add(row);
        }
        if (!districtRows.isEmpty()) {
            exportRows.add(buildSalesAmountSummaryRow("districtTotal", currentDistrict, "District Total", districtRows, dateRange));
        }
        exportRows.add(buildSalesAmountSummaryRow("grandTotal", "", "Grand Total", rows, dateRange));
        return exportRows;
    }

    private static SalesAmountPivotRow buildSalesAmountSummaryRow(String rowType, String districtName, String storeName, List<SalesAmountPivotRow> rows, List<LocalDate> dateRange) {
        SalesAmountPivotRow summary = new SalesAmountPivotRow();
        summary.rowType = rowType;
        summary.districtName = safe(districtName);
        summary.storeName = safe(storeName);
        summary.byDate = new HashMap<>();
        for (LocalDate date : dateRange) {
            String iso = date.toString();
            java.math.BigDecimal total = java.math.BigDecimal.ZERO;
            for (SalesAmountPivotRow row : rows) {
                total = total.add(row.byDate != null ? row.byDate.getOrDefault(iso, java.math.BigDecimal.ZERO) : java.math.BigDecimal.ZERO);
            }
            summary.byDate.put(iso, total);
        }
        summary.totalSale = calculateSalesAmountTotal(summary, dateRange);
        summary.averageSale = calculateSalesAmountAverage(summary, dateRange);
        return summary;
    }

    private static java.math.BigDecimal calculateSalesAmountTotal(SalesAmountPivotRow row, List<LocalDate> dateRange) {
        java.math.BigDecimal total = java.math.BigDecimal.ZERO;
        for (LocalDate date : dateRange) {
            total = total.add(row.byDate != null ? row.byDate.getOrDefault(date.toString(), java.math.BigDecimal.ZERO) : java.math.BigDecimal.ZERO);
        }
        return total;
    }

    private static java.math.BigDecimal calculateSalesAmountAverage(SalesAmountPivotRow row, List<LocalDate> dateRange) {
        int saleDays = 0;
        for (LocalDate date : dateRange) {
            java.math.BigDecimal value = row.byDate != null ? row.byDate.getOrDefault(date.toString(), java.math.BigDecimal.ZERO) : java.math.BigDecimal.ZERO;
            if (value.compareTo(java.math.BigDecimal.ZERO) != 0) {
                saleDays += 1;
            }
        }
        if (saleDays <= 0) return java.math.BigDecimal.ZERO;
        return calculateSalesAmountTotal(row, dateRange).divide(java.math.BigDecimal.valueOf(saleDays), 2, java.math.RoundingMode.HALF_UP);
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
        private String rowType;
        private String districtName;
        private String shopType;
        private String storeStatus;
        private String owner;
        private String storeCode;
        private String storeName;
        private Map<String, Integer> byDate;
    }

    private static class SalesAmountPivotRow {
        private String rowType;
        private String districtName;
        private String shopType;
        private String storeStatus;
        private String storeCode;
        private String storeName;
        private Map<String, java.math.BigDecimal> byDate;
        private java.math.BigDecimal totalSale = java.math.BigDecimal.ZERO;
        private java.math.BigDecimal averageSale = java.math.BigDecimal.ZERO;
    }
}
