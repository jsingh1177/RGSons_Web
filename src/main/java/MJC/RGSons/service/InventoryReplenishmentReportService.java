package MJC.RGSons.service;

import MJC.RGSons.dto.InventoryReplenishmentResponseDTO;
import MJC.RGSons.dto.InventoryReplenishmentRowDTO;
import MJC.RGSons.dto.InventoryReplenishmentSummaryDTO;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Date;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class InventoryReplenishmentReportService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final Map<String, String> SORT_COLUMN_MAP = new LinkedHashMap<>();

    static {
        SORT_COLUMN_MAP.put("district", "district");
        SORT_COLUMN_MAP.put("storeCode", "store_code");
        SORT_COLUMN_MAP.put("storeName", "store_name");
        SORT_COLUMN_MAP.put("itemName", "item_name");
        SORT_COLUMN_MAP.put("size", "size_name");
        SORT_COLUMN_MAP.put("category", "category_name");
        SORT_COLUMN_MAP.put("saleQty", "sale_qty");
        SORT_COLUMN_MAP.put("saleAmount", "sale_amount");
        SORT_COLUMN_MAP.put("averageDailySale", "average_daily_sale");
        SORT_COLUMN_MAP.put("forecastQuantity", "forecast_quantity");
        SORT_COLUMN_MAP.put("closingStock", "closing_stock");
        SORT_COLUMN_MAP.put("shortExcessQty", "short_excess_qty");
        SORT_COLUMN_MAP.put("stockCoverageDays", "stock_coverage_days");
        SORT_COLUMN_MAP.put("suggestedOrderQty", "suggested_order_qty");
    }

    public InventoryReplenishmentResponseDTO getReport(
            String fromDate,
            String toDate,
            String district,
            String storeCode,
            String itemCodesCsv,
            String sizeCode,
            Integer forecastDays,
            Integer page,
            Integer size,
            String sortBy,
            String sortDir
    ) {
        LocalDate from = parseDate(fromDate, LocalDate.now().withDayOfMonth(1));
        LocalDate to = parseDate(toDate, LocalDate.now());
        if (to.isBefore(from)) {
            LocalDate swap = from;
            from = to;
            to = swap;
        }

        int safeForecastDays = forecastDays == null || forecastDays <= 0 ? 7 : forecastDays;
        int safePage = page == null || page < 0 ? 0 : page;
        int safeSize = size == null || size <= 0 ? 100 : Math.min(size, 500);
        int noOfDays = Math.max(1, (int) (ChronoUnit.DAYS.between(from, to) + 1L));
        List<String> itemCodes = normalizeCsvValues(itemCodesCsv);

        QueryContext baseContext = buildBaseQuery(from, to, district, storeCode, itemCodes, sizeCode, safeForecastDays, noOfDays);

        InventoryReplenishmentResponseDTO response = new InventoryReplenishmentResponseDTO();
        response.setSummary(fetchSummary(baseContext));
        response.setTotalRows(fetchTotalRows(baseContext));
        response.setRows(fetchRows(baseContext, safePage, safeSize, sortBy, sortDir));
        response.setPage(safePage);
        response.setSize(safeSize);
        response.setSortBy(normalizeSortBy(sortBy));
        response.setSortDir(normalizeSortDir(sortDir));
        return response;
    }

    public ByteArrayInputStream exportToExcel(
            String fromDate,
            String toDate,
            String district,
            String storeCode,
            String itemCodesCsv,
            String sizeCode,
            Integer forecastDays,
            String sortBy,
            String sortDir
    ) throws IOException {
        LocalDate from = parseDate(fromDate, LocalDate.now().withDayOfMonth(1));
        LocalDate to = parseDate(toDate, LocalDate.now());
        if (to.isBefore(from)) {
            LocalDate swap = from;
            from = to;
            to = swap;
        }
        int safeForecastDays = forecastDays == null || forecastDays <= 0 ? 7 : forecastDays;
        int noOfDays = Math.max(1, (int) (ChronoUnit.DAYS.between(from, to) + 1L));
        List<String> itemCodes = normalizeCsvValues(itemCodesCsv);
        QueryContext baseContext = buildBaseQuery(from, to, district, storeCode, itemCodes, sizeCode, safeForecastDays, noOfDays);
        List<InventoryReplenishmentRowDTO> rows = fetchRows(baseContext, null, null, sortBy, sortDir);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Inventory Replenishment");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle textStyle = workbook.createCellStyle();
            DataFormat dataFormat = workbook.createDataFormat();

            CellStyle qtyStyle = workbook.createCellStyle();
            qtyStyle.cloneStyleFrom(textStyle);
            qtyStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.cloneStyleFrom(textStyle);
            amountStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            String[] headers = {
                    "District", "Store Code", "Store Name", "Item Name", "Size", "Category",
                    "Sale Qty", "Sale Amount", "No Of Days", "Average Daily Sale", "Forecast Days",
                    "Forecast Quantity", "Closing Stock", "Short / Excess Qty", "Stock Coverage Days",
                    "Suggested Order Qty"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 1;
            for (InventoryReplenishmentRowDTO dto : rows) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(nullSafe(dto.getDistrict()));
                row.createCell(1).setCellValue(nullSafe(dto.getStoreCode()));
                row.createCell(2).setCellValue(nullSafe(dto.getStoreName()));
                row.createCell(3).setCellValue(nullSafe(dto.getItemName()));
                row.createCell(4).setCellValue(nullSafe(dto.getSize()));
                row.createCell(5).setCellValue(nullSafe(dto.getCategory()));

                writeNumberCell(row, 6, dto.getSaleQty(), qtyStyle);
                writeNumberCell(row, 7, dto.getSaleAmount(), amountStyle);
                row.createCell(8).setCellValue(dto.getNoOfDays() == null ? 0 : dto.getNoOfDays());
                writeNumberCell(row, 9, dto.getAverageDailySale(), qtyStyle);
                row.createCell(10).setCellValue(dto.getForecastDays() == null ? 0 : dto.getForecastDays());
                writeNumberCell(row, 11, dto.getForecastQuantity(), qtyStyle);
                writeNumberCell(row, 12, dto.getClosingStock(), qtyStyle);
                writeNumberCell(row, 13, dto.getShortExcessQty(), qtyStyle);
                writeNumberCell(row, 14, dto.getStockCoverageDays(), qtyStyle);
                writeNumberCell(row, 15, dto.getSuggestedOrderQty(), qtyStyle);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private InventoryReplenishmentSummaryDTO fetchSummary(QueryContext baseContext) {
        String sql = baseContext.sql +
                "SELECT " +
                "  CAST(COALESCE(SUM(sale_qty), 0) AS DECIMAL(18, 2)) AS total_sale_qty, " +
                "  CAST(COALESCE(SUM(sale_amount), 0) AS DECIMAL(18, 2)) AS total_sale_amount, " +
                "  CAST(COALESCE(SUM(closing_stock), 0) AS DECIMAL(18, 2)) AS total_closing_stock, " +
                "  CAST(COALESCE(SUM(forecast_quantity), 0) AS DECIMAL(18, 2)) AS total_forecast_qty, " +
                "  CAST(COALESCE(SUM(suggested_order_qty), 0) AS DECIMAL(18, 2)) AS total_suggested_order_qty, " +
                "  CAST(COALESCE(SUM(CASE WHEN short_excess_qty < 0 THEN 1 ELSE 0 END), 0) AS INT) AS total_short_items, " +
                "  CAST(COALESCE(SUM(CASE WHEN short_excess_qty > 0 THEN 1 ELSE 0 END), 0) AS INT) AS total_excess_items " +
                "FROM final_rows";

        return jdbcTemplate.query(sql, baseContext.params.toArray(), rs -> {
            InventoryReplenishmentSummaryDTO dto = new InventoryReplenishmentSummaryDTO();
            if (rs.next()) {
                dto.setTotalSaleQty(rs.getDouble("total_sale_qty"));
                dto.setTotalSaleAmount(rs.getDouble("total_sale_amount"));
                dto.setTotalClosingStock(rs.getDouble("total_closing_stock"));
                dto.setTotalForecastQty(rs.getDouble("total_forecast_qty"));
                dto.setTotalSuggestedOrderQty(rs.getDouble("total_suggested_order_qty"));
                dto.setTotalShortItems(rs.getInt("total_short_items"));
                dto.setTotalExcessItems(rs.getInt("total_excess_items"));
            }
            return dto;
        });
    }

    private long fetchTotalRows(QueryContext baseContext) {
        String sql = baseContext.sql + "SELECT COUNT(1) AS total_rows FROM final_rows";
        Long count = jdbcTemplate.query(sql, baseContext.params.toArray(), rs -> rs.next() ? rs.getLong("total_rows") : 0L);
        return count == null ? 0L : count;
    }

    private List<InventoryReplenishmentRowDTO> fetchRows(
            QueryContext baseContext,
            Integer page,
            Integer size,
            String sortBy,
            String sortDir
    ) {
        List<Object> params = new ArrayList<>(baseContext.params);
        StringBuilder sql = new StringBuilder(baseContext.sql);
        sql.append("SELECT ");
        sql.append("  district, store_code, store_name, item_code, item_name, size_code, size_name, category_name, ");
        sql.append("  CAST(sale_qty AS DECIMAL(18, 2)) AS sale_qty, ");
        sql.append("  CAST(sale_amount AS DECIMAL(18, 2)) AS sale_amount, ");
        sql.append("  no_of_days, forecast_days, ");
        sql.append("  CAST(average_daily_sale AS DECIMAL(18, 4)) AS average_daily_sale, ");
        sql.append("  CAST(forecast_quantity AS DECIMAL(18, 2)) AS forecast_quantity, ");
        sql.append("  CAST(closing_stock AS DECIMAL(18, 2)) AS closing_stock, ");
        sql.append("  CAST(short_excess_qty AS DECIMAL(18, 2)) AS short_excess_qty, ");
        sql.append("  CAST(stock_coverage_days AS DECIMAL(18, 2)) AS stock_coverage_days, ");
        sql.append("  CAST(suggested_order_qty AS DECIMAL(18, 2)) AS suggested_order_qty ");
        sql.append("FROM final_rows ");
        sql.append("ORDER BY ").append(resolveOrderBy(sortBy, sortDir));

        if (page != null && size != null) {
            sql.append(" OFFSET ? ROWS FETCH NEXT ? ROWS ONLY");
            params.add(page * size);
            params.add(size);
        }

        return jdbcTemplate.query(sql.toString(), params.toArray(), (rs, rowNum) -> {
            InventoryReplenishmentRowDTO dto = new InventoryReplenishmentRowDTO();
            dto.setDistrict(rs.getString("district"));
            dto.setStoreCode(rs.getString("store_code"));
            dto.setStoreName(rs.getString("store_name"));
            dto.setItemCode(rs.getString("item_code"));
            dto.setItemName(rs.getString("item_name"));
            dto.setSizeCode(rs.getString("size_code"));
            dto.setSize(rs.getString("size_name"));
            dto.setCategory(rs.getString("category_name"));
            dto.setSaleQty(rs.getDouble("sale_qty"));
            dto.setSaleAmount(rs.getDouble("sale_amount"));
            dto.setNoOfDays(rs.getInt("no_of_days"));
            dto.setForecastDays(rs.getInt("forecast_days"));
            dto.setAverageDailySale(rs.getDouble("average_daily_sale"));
            dto.setForecastQuantity(rs.getDouble("forecast_quantity"));
            dto.setClosingStock(rs.getDouble("closing_stock"));
            dto.setShortExcessQty(rs.getDouble("short_excess_qty"));
            dto.setStockCoverageDays(rs.getDouble("stock_coverage_days"));
            dto.setSuggestedOrderQty(rs.getDouble("suggested_order_qty"));
            return dto;
        });
    }

    private QueryContext buildBaseQuery(
            LocalDate fromDate,
            LocalDate toDate,
            String district,
            String storeCode,
            List<String> itemCodes,
            String sizeCode,
            int forecastDays,
            int noOfDays
    ) {
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder();

        sql.append("WITH sales_agg AS (");
        sql.append("  SELECT ");
        sql.append("    LTRIM(RTRIM(st.district)) AS district, ");
        sql.append("    LTRIM(RTRIM(ti.store_code)) AS store_code, ");
        sql.append("    LTRIM(RTRIM(st.store_name)) AS store_name, ");
        sql.append("    LTRIM(RTRIM(ti.item_code)) AS item_code, ");
        sql.append("    LTRIM(RTRIM(COALESCE(ti.size_code, ''))) AS size_code, ");
        sql.append("    SUM(COALESCE(ti.quantity, 0)) AS sale_qty, ");
        sql.append("    SUM(COALESCE(ti.amount, 0)) AS sale_amount ");
        sql.append("  FROM tran_item ti ");
        sql.append("  JOIN tran_head th ");
        sql.append("    ON LTRIM(RTRIM(th.store_code)) = LTRIM(RTRIM(ti.store_code)) ");
        sql.append("   AND LTRIM(RTRIM(th.invoice_no)) = LTRIM(RTRIM(ti.invoice_no)) ");
        sql.append("   AND COALESCE(LTRIM(RTRIM(th.invoice_date)), '') = COALESCE(LTRIM(RTRIM(ti.invoice_date)), '') ");
        sql.append("  JOIN store st ON LTRIM(RTRIM(st.store_code)) = LTRIM(RTRIM(ti.store_code)) ");
        sql.append("  WHERE th.status = 'SUBMITTED' ");
        sql.append("    AND ti.tran_date BETWEEN ? AND ? ");
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));
        appendCommonFilters(sql, params, "st", "ti", district, storeCode, itemCodes, sizeCode);
        sql.append("  GROUP BY LTRIM(RTRIM(st.district)), LTRIM(RTRIM(ti.store_code)), LTRIM(RTRIM(st.store_name)), ");
        sql.append("           LTRIM(RTRIM(ti.item_code)), LTRIM(RTRIM(COALESCE(ti.size_code, ''))) ");
        sql.append("), closing_agg AS (");
        sql.append("  SELECT ");
        sql.append("    LTRIM(RTRIM(st.district)) AS district, ");
        sql.append("    LTRIM(RTRIM(fs.store_code)) AS store_code, ");
        sql.append("    LTRIM(RTRIM(st.store_name)) AS store_name, ");
        sql.append("    LTRIM(RTRIM(fs.item_code)) AS item_code, ");
        sql.append("    LTRIM(RTRIM(COALESCE(fs.size_code, ''))) AS size_code, ");
        sql.append("    SUM(COALESCE(fs.closing_qty, 0)) AS closing_stock ");
        sql.append("  FROM dbo.inv_fifo_snapshot fs ");
        sql.append("  JOIN store st ON LTRIM(RTRIM(st.store_code)) = LTRIM(RTRIM(fs.store_code)) ");
        sql.append("  WHERE fs.as_on_date = ? ");
        params.add(Date.valueOf(toDate));
        appendCommonFilters(sql, params, "st", "fs", district, storeCode, itemCodes, sizeCode);
        sql.append("  GROUP BY LTRIM(RTRIM(st.district)), LTRIM(RTRIM(fs.store_code)), LTRIM(RTRIM(st.store_name)), ");
        sql.append("           LTRIM(RTRIM(fs.item_code)), LTRIM(RTRIM(COALESCE(fs.size_code, ''))) ");
        sql.append("), combined AS (");
        sql.append("  SELECT ");
        sql.append("    COALESCE(s.district, c.district) AS district, ");
        sql.append("    COALESCE(s.store_code, c.store_code) AS store_code, ");
        sql.append("    COALESCE(s.store_name, c.store_name) AS store_name, ");
        sql.append("    COALESCE(s.item_code, c.item_code) AS item_code, ");
        sql.append("    COALESCE(s.size_code, c.size_code) AS size_code, ");
        sql.append("    COALESCE(s.sale_qty, 0) AS sale_qty, ");
        sql.append("    COALESCE(s.sale_amount, 0) AS sale_amount, ");
        sql.append("    COALESCE(c.closing_stock, 0) AS closing_stock ");
        sql.append("  FROM sales_agg s ");
        sql.append("  FULL OUTER JOIN closing_agg c ");
        sql.append("    ON s.store_code = c.store_code ");
        sql.append("   AND s.item_code = c.item_code ");
        sql.append("   AND s.size_code = c.size_code ");
        sql.append("), final_rows AS (");
        sql.append("  SELECT ");
        sql.append("    c.district, ");
        sql.append("    c.store_code, ");
        sql.append("    c.store_name, ");
        sql.append("    c.item_code, ");
        sql.append("    COALESCE(NULLIF(LTRIM(RTRIM(i.item_name)), ''), c.item_code) AS item_name, ");
        sql.append("    c.size_code, ");
        sql.append("    COALESCE(NULLIF(LTRIM(RTRIM(sz.name)), ''), c.size_code) AS size_name, ");
        sql.append("    COALESCE(NULLIF(LTRIM(RTRIM(cat.name)), ''), '') AS category_name, ");
        sql.append("    CAST(COALESCE(c.sale_qty, 0) AS DECIMAL(18, 4)) AS sale_qty, ");
        sql.append("    CAST(COALESCE(c.sale_amount, 0) AS DECIMAL(18, 2)) AS sale_amount, ");
        sql.append("    ? AS no_of_days, ");
        sql.append("    ? AS forecast_days, ");
        params.add(noOfDays);
        params.add(forecastDays);
        sql.append("    CAST(CASE WHEN COALESCE(c.sale_qty, 0) = 0 THEN 0 ELSE COALESCE(c.sale_qty, 0) / CAST(? AS DECIMAL(18, 4)) END AS DECIMAL(18, 4)) AS average_daily_sale, ");
        sql.append("    CAST((CASE WHEN COALESCE(c.sale_qty, 0) = 0 THEN 0 ELSE COALESCE(c.sale_qty, 0) / CAST(? AS DECIMAL(18, 4)) END) * ? AS DECIMAL(18, 2)) AS forecast_quantity, ");
        sql.append("    CAST(COALESCE(c.closing_stock, 0) AS DECIMAL(18, 2)) AS closing_stock, ");
        sql.append("    CAST(COALESCE(c.closing_stock, 0) - ((CASE WHEN COALESCE(c.sale_qty, 0) = 0 THEN 0 ELSE COALESCE(c.sale_qty, 0) / CAST(? AS DECIMAL(18, 4)) END) * ?) AS DECIMAL(18, 2)) AS short_excess_qty, ");
        sql.append("    CAST(CASE WHEN COALESCE(c.sale_qty, 0) = 0 THEN 0 ELSE COALESCE(c.closing_stock, 0) / (COALESCE(c.sale_qty, 0) / CAST(? AS DECIMAL(18, 4))) END AS DECIMAL(18, 2)) AS stock_coverage_days, ");
        sql.append("    CAST(CASE WHEN ((CASE WHEN COALESCE(c.sale_qty, 0) = 0 THEN 0 ELSE COALESCE(c.sale_qty, 0) / CAST(? AS DECIMAL(18, 4)) END) * ?) > COALESCE(c.closing_stock, 0) ");
        sql.append("      THEN ((CASE WHEN COALESCE(c.sale_qty, 0) = 0 THEN 0 ELSE COALESCE(c.sale_qty, 0) / CAST(? AS DECIMAL(18, 4)) END) * ?) - COALESCE(c.closing_stock, 0) ");
        sql.append("      ELSE 0 END AS DECIMAL(18, 2)) AS suggested_order_qty ");
        params.add(noOfDays);
        params.add(noOfDays);
        params.add(forecastDays);
        params.add(noOfDays);
        params.add(forecastDays);
        params.add(noOfDays);
        params.add(noOfDays);
        params.add(forecastDays);
        params.add(noOfDays);
        params.add(forecastDays);
        sql.append("  FROM combined c ");
        sql.append("  LEFT JOIN items i ON LTRIM(RTRIM(i.item_code)) = c.item_code ");
        sql.append("  LEFT JOIN category cat ON LTRIM(RTRIM(cat.code)) = LTRIM(RTRIM(COALESCE(i.category_code, ''))) ");
        sql.append("  LEFT JOIN size sz ON LTRIM(RTRIM(sz.code)) = c.size_code ");
        sql.append(")");

        return new QueryContext(sql.toString(), params);
    }

    private void appendCommonFilters(
            StringBuilder sql,
            List<Object> params,
            String storeAlias,
            String dataAlias,
            String district,
            String storeCode,
            List<String> itemCodes,
            String sizeCode
    ) {
        sql.append(" AND LTRIM(RTRIM(COALESCE(").append(storeAlias).append(".store_type, ''))) = 'Store' ");

        if (district != null && !district.isBlank()) {
            sql.append(" AND LTRIM(RTRIM(").append(storeAlias).append(".district)) = LTRIM(RTRIM(?)) ");
            params.add(district.trim());
        }
        if (storeCode != null && !storeCode.isBlank()) {
            sql.append(" AND LTRIM(RTRIM(").append(dataAlias).append(".store_code)) = LTRIM(RTRIM(?)) ");
            params.add(storeCode.trim());
        }
        if (sizeCode != null && !sizeCode.isBlank()) {
            sql.append(" AND LTRIM(RTRIM(COALESCE(").append(dataAlias).append(".size_code, ''))) = LTRIM(RTRIM(?)) ");
            params.add(sizeCode.trim());
        }
        if (!itemCodes.isEmpty()) {
            sql.append(" AND LTRIM(RTRIM(").append(dataAlias).append(".item_code)) IN (");
            appendPlaceholders(sql, itemCodes.size());
            sql.append(") ");
            params.addAll(itemCodes);
        }
    }

    private void appendPlaceholders(StringBuilder sql, int count) {
        for (int i = 0; i < count; i += 1) {
            if (i > 0) sql.append(", ");
            sql.append("?");
        }
    }

    private LocalDate parseDate(String raw, LocalDate fallback) {
        if (raw == null || raw.trim().isEmpty()) {
            return fallback;
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private List<String> normalizeCsvValues(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> set = new LinkedHashSet<>();
        String[] parts = raw.split(",");
        for (String part : parts) {
            String value = part == null ? "" : part.trim();
            if (!value.isEmpty()) {
                set.add(value);
            }
        }
        return new ArrayList<>(set);
    }

    private String normalizeSortBy(String sortBy) {
        String key = String.valueOf(sortBy == null ? "" : sortBy).trim();
        return SORT_COLUMN_MAP.containsKey(key) ? key : "shortExcessQty";
    }

    private String normalizeSortDir(String sortDir) {
        return "ASC".equalsIgnoreCase(String.valueOf(sortDir)) ? "ASC" : "DESC";
    }

    private String resolveOrderBy(String sortBy, String sortDir) {
        String normalizedSortBy = normalizeSortBy(sortBy);
        String normalizedSortDir = normalizeSortDir(sortDir);
        String resolved = SORT_COLUMN_MAP.getOrDefault(normalizedSortBy, "short_excess_qty");

        if ("shortExcessQty".equals(normalizedSortBy)) {
            return "CASE WHEN short_excess_qty < 0 THEN ABS(short_excess_qty) ELSE 0 END " + normalizedSortDir
                    + ", average_daily_sale DESC, item_name ASC";
        }
        if ("itemName".equals(normalizedSortBy)) {
            return resolved + " " + normalizedSortDir + ", size_name ASC, store_name ASC";
        }
        return resolved + " " + normalizedSortDir + ", item_name ASC";
    }

    private void writeNumberCell(Row row, int cellIndex, Double value, CellStyle style) {
        Cell cell = row.createCell(cellIndex);
        cell.setCellValue(value == null ? 0.0 : value);
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private static class QueryContext {
        private final String sql;
        private final List<Object> params;

        private QueryContext(String sql, List<Object> params) {
            this.sql = sql;
            this.params = params;
        }
    }
}
