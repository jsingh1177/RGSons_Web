package MJC.RGSons.service;

import MJC.RGSons.dto.ClosingStockItemWiseDTO;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ClosingStockItemWiseReportService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private LocalDate parseAsOnDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return LocalDate.now();
        }
        try {
            if (dateStr.matches("\\d{2}-\\d{2}-\\d{4}")) {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
            }
            if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return LocalDate.parse(dateStr);
            }
        } catch (Exception ignored) {
        }
        return LocalDate.now();
    }

    public List<String> getDistricts() {
        String sql = "SELECT DISTINCT district FROM store WHERE district IS NOT NULL AND district <> '' ORDER BY district";
        return jdbcTemplate.queryForList(sql, String.class);
    }

    public List<ClosingStockItemWiseDTO> getReportData(String district, String storeCode, String itemQuery, String sizeCode, String asOnDate) {
        Date asOnSql = Date.valueOf(parseAsOnDate(asOnDate));

        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  s.district, ");
        sql.append("  LTRIM(RTRIM(fs.store_code)) AS store_code, ");
        sql.append("  s.store_name, ");
        sql.append("  c.name AS item_category, ");
        sql.append("  LTRIM(RTRIM(fs.item_code)) AS item_code, ");
        sql.append("  i.item_name, ");
        sql.append("  LTRIM(RTRIM(COALESCE(fs.size_code, ''))) AS size_code, ");
        sql.append("  COALESCE(sz.name, LTRIM(RTRIM(COALESCE(fs.size_code, '')))) AS size_name, ");
        sql.append("  CASE WHEN sz.short_order IS NULL OR sz.short_order = 0 THEN 999999 ELSE sz.short_order END AS size_order, ");
        sql.append("  SUM(CAST(COALESCE(fs.closing_qty, 0) AS DOUBLE PRECISION)) AS quantity, ");
        sql.append("  SUM(CAST(COALESCE(fs.closing_value, 0) AS DOUBLE PRECISION)) AS value ");
        sql.append("FROM dbo.inv_fifo_snapshot fs ");
        sql.append("JOIN store s ON LTRIM(RTRIM(fs.store_code)) = LTRIM(RTRIM(s.store_code)) ");
        sql.append("JOIN items i ON LTRIM(RTRIM(fs.item_code)) = LTRIM(RTRIM(i.item_code)) ");
        sql.append("JOIN category c ON i.category_code = c.code ");
        sql.append("LEFT JOIN size sz ON LTRIM(RTRIM(COALESCE(fs.size_code, ''))) = LTRIM(RTRIM(sz.code)) ");
        sql.append("WHERE fs.as_on_date = ? ");
        sql.append("AND COALESCE(fs.closing_qty, 0) <> 0 ");

        List<Object> params = new ArrayList<>();
        params.add(asOnSql);
        appendSnapshotFilters(sql, params, district, storeCode, itemQuery, sizeCode);

        sql.append("GROUP BY s.district, LTRIM(RTRIM(fs.store_code)), s.store_name, c.name, c.Short_Order, LTRIM(RTRIM(fs.item_code)), i.item_name, ");
        sql.append("LTRIM(RTRIM(COALESCE(fs.size_code, ''))), COALESCE(sz.name, LTRIM(RTRIM(COALESCE(fs.size_code, '')))), sz.short_order ");
        sql.append("ORDER BY s.district, s.store_name, CASE WHEN c.Short_Order IS NULL OR c.Short_Order = 0 THEN 999999 ELSE c.Short_Order END, ");
        sql.append("c.name, i.item_name, CASE WHEN sz.short_order IS NULL OR sz.short_order = 0 THEN 999999 ELSE sz.short_order END, COALESCE(sz.name, LTRIM(RTRIM(COALESCE(fs.size_code, ''))))");

        return jdbcTemplate.query(sql.toString(), params.toArray(), (rs, rowNum) -> {
            ClosingStockItemWiseDTO dto = new ClosingStockItemWiseDTO();
            dto.setDistrict(rs.getString("district"));
            dto.setStoreCode(rs.getString("store_code"));
            dto.setStoreName(rs.getString("store_name"));
            dto.setItemCategory(rs.getString("item_category"));
            dto.setItemCode(rs.getString("item_code"));
            dto.setItemName(rs.getString("item_name"));
            dto.setSizeCode(rs.getString("size_code"));
            dto.setSize(rs.getString("size_name"));
            dto.setSizeOrder(rs.getInt("size_order"));
            dto.setQuantity(rs.getDouble("quantity"));
            dto.setValue(rs.getDouble("value"));
            return dto;
        });
    }

    public ByteArrayInputStream exportToExcel(String district, String storeCode, String itemQuery, String sizeCode, String asOnDate) throws IOException {
        List<ClosingStockItemWiseDTO> data = getReportData(district, storeCode, itemQuery, sizeCode, asOnDate);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Closing Stock Item Wise");

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle textStyle = workbook.createCellStyle();
            textStyle.setBorderBottom(BorderStyle.THIN);
            textStyle.setBorderTop(BorderStyle.THIN);
            textStyle.setBorderLeft(BorderStyle.THIN);
            textStyle.setBorderRight(BorderStyle.THIN);

            DataFormat format = workbook.createDataFormat();

            CellStyle qtyStyle = workbook.createCellStyle();
            qtyStyle.cloneStyleFrom(textStyle);
            qtyStyle.setDataFormat(format.getFormat("#,##0.###"));

            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.cloneStyleFrom(textStyle);
            amountStyle.setDataFormat(format.getFormat("#,##0.00"));

            CellStyle totalLabelStyle = workbook.createCellStyle();
            totalLabelStyle.cloneStyleFrom(headerStyle);
            totalLabelStyle.setAlignment(HorizontalAlignment.LEFT);

            CellStyle totalQtyStyle = workbook.createCellStyle();
            totalQtyStyle.cloneStyleFrom(qtyStyle);
            Font totalFont = workbook.createFont();
            totalFont.setBold(true);
            totalQtyStyle.setFont(totalFont);
            totalQtyStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            totalQtyStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle totalAmountStyle = workbook.createCellStyle();
            totalAmountStyle.cloneStyleFrom(amountStyle);
            totalAmountStyle.setFont(totalFont);
            totalAmountStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            totalAmountStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(28);
            Cell titleCell = titleRow.createCell(0);
            String title = "Closing Stock - Item Wise As on : " + parseAsOnDate(asOnDate).format(DateTimeFormatter.ofPattern("dd-MMM-yyyy"));
            titleCell.setCellValue(title);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));

            Row headerRow = sheet.createRow(1);
            String[] headers = { "District", "Store Name", "Item Category", "Item Name", "Size", "Quantity", "Value" };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 2;
            double totalQty = 0.0;
            double totalValue = 0.0;
            for (ClosingStockItemWiseDTO dto : data) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(dto.getDistrict() != null ? dto.getDistrict() : "");
                row.createCell(1).setCellValue(dto.getStoreName() != null ? dto.getStoreName() : "");
                row.createCell(2).setCellValue(dto.getItemCategory() != null ? dto.getItemCategory() : "");
                row.createCell(3).setCellValue(dto.getItemName() != null ? dto.getItemName() : "");
                row.createCell(4).setCellValue(dto.getSize() != null ? dto.getSize() : "");

                Cell qtyCell = row.createCell(5);
                qtyCell.setCellValue(dto.getQuantity() != null ? dto.getQuantity() : 0.0);
                qtyCell.setCellStyle(qtyStyle);

                Cell valueCell = row.createCell(6);
                valueCell.setCellValue(dto.getValue() != null ? dto.getValue() : 0.0);
                valueCell.setCellStyle(amountStyle);

                for (int i = 0; i < 5; i++) {
                    row.getCell(i).setCellStyle(textStyle);
                }

                totalQty += dto.getQuantity() != null ? dto.getQuantity() : 0.0;
                totalValue += dto.getValue() != null ? dto.getValue() : 0.0;
            }

            Row totalRow = sheet.createRow(rowIdx);
            Cell totalLabelCell = totalRow.createCell(0);
            totalLabelCell.setCellValue("GRAND TOTAL");
            totalLabelCell.setCellStyle(totalLabelStyle);
            for (int i = 1; i <= 4; i++) {
                Cell filler = totalRow.createCell(i);
                filler.setCellStyle(totalLabelStyle);
            }
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, 4));

            Cell totalQtyCell = totalRow.createCell(5);
            totalQtyCell.setCellValue(totalQty);
            totalQtyCell.setCellStyle(totalQtyStyle);

            Cell totalValueCell = totalRow.createCell(6);
            totalValueCell.setCellValue(totalValue);
            totalValueCell.setCellStyle(totalAmountStyle);

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private void appendSnapshotFilters(StringBuilder sql, List<Object> params,
                                       String district, String storeCode, String itemQuery, String sizeCode) {
        if (district != null && !district.isBlank()) {
            sql.append("AND LTRIM(RTRIM(s.district)) = LTRIM(RTRIM(?)) ");
            params.add(district.trim());
        }
        if (storeCode != null && !storeCode.isBlank()) {
            sql.append("AND LTRIM(RTRIM(fs.store_code)) = LTRIM(RTRIM(?)) ");
            params.add(storeCode.trim());
        }
        if (itemQuery != null && !itemQuery.isBlank()) {
            String q = "%" + itemQuery.trim().toLowerCase(Locale.ROOT) + "%";
            sql.append("AND (LOWER(LTRIM(RTRIM(fs.item_code))) LIKE ? OR LOWER(LTRIM(RTRIM(i.item_name))) LIKE ?) ");
            params.add(q);
            params.add(q);
        }
        if (sizeCode != null && !sizeCode.isBlank()) {
            sql.append("AND LTRIM(RTRIM(COALESCE(fs.size_code, ''))) = LTRIM(RTRIM(?)) ");
            params.add(sizeCode.trim());
        }
    }
}
