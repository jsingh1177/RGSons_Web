package MJC.RGSons.service;

import MJC.RGSons.dto.ClosingStockReportDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

@Service
public class ClosingStockReportService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public List<String> getZones() {
        String sql = "SELECT DISTINCT zone FROM store WHERE zone IS NOT NULL AND zone <> '' ORDER BY zone";
        return jdbcTemplate.queryForList(sql, String.class);
    }

    public List<String> getDistricts(String zone) {
        String sql = "SELECT DISTINCT district FROM store WHERE district IS NOT NULL AND district <> ''";
        List<Object> params = new ArrayList<>();
        if (zone != null && !zone.isEmpty()) {
            sql += " AND zone = ?";
            params.add(zone);
        }
        sql += " ORDER BY district";
        return jdbcTemplate.queryForList(sql, String.class, params.toArray());
    }

    public List<String> getDynamicColumns(String zone, String district) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT DISTINCT c.name ");
        sql.append("FROM Inventory_Master im ");
        sql.append("JOIN items i ON im.Item_code = i.item_code ");
        sql.append("JOIN category c ON i.category_code = c.code ");
        sql.append("JOIN store s ON im.Store_code = s.store_code ");
        sql.append("WHERE im.Closing <> 0 ");

        List<Object> params = new ArrayList<>();
        if (zone != null && !zone.isEmpty()) {
            sql.append("AND s.zone = ? ");
            params.add(zone);
        }
        if (district != null && !district.isEmpty()) {
            sql.append("AND s.district = ? ");
            params.add(district);
        }

        sql.append("ORDER BY c.name");

        return jdbcTemplate.queryForList(sql.toString(), String.class, params.toArray());
    }

    public List<ClosingStockReportDTO> getReportData(String zone, String district, String valuationMethod) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  s.district, ");
        sql.append("  s.store_name, ");
        sql.append("  c.name as category_name, ");
        
        // Dynamic price selection based on valuation method
        String priceColumn = "pm.MRP"; // Default
        if ("Purchase".equalsIgnoreCase(valuationMethod)) {
            priceColumn = "pm.Purchase_Price";
        } else if ("Sale".equalsIgnoreCase(valuationMethod)) {
            priceColumn = "pm.Sale_Price";
        } else if ("MRP".equalsIgnoreCase(valuationMethod)) {
            priceColumn = "pm.MRP";
        }

        sql.append("  SUM(CAST(im.Closing AS DOUBLE PRECISION)) as total_qty, ");
        sql.append("  SUM(CAST(im.Closing AS DOUBLE PRECISION) * COALESCE(" + priceColumn + ", 0)) as total_amount ");
        
        sql.append("FROM Inventory_Master im ");
        sql.append("JOIN store s ON im.Store_code = s.store_code ");
        sql.append("JOIN items i ON im.Item_code = i.item_code ");
        sql.append("JOIN category c ON i.category_code = c.code ");
        sql.append("LEFT JOIN Price_Master pm ON im.Item_code = pm.Item_Code AND im.Size_code = pm.Size_Code ");
        
        sql.append("WHERE im.Closing <> 0 ");

        List<Object> params = new ArrayList<>();
        if (zone != null && !zone.isEmpty()) {
            sql.append("AND s.zone = ? ");
            params.add(zone);
        }
        if (district != null && !district.isEmpty()) {
            sql.append("AND s.district = ? ");
            params.add(district);
        }

        sql.append("GROUP BY s.district, s.store_name, c.name ");
        sql.append("ORDER BY s.district, s.store_name, c.name");

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql.toString(), params.toArray());

        // Pivot Data
        Map<String, ClosingStockReportDTO> storeMap = new LinkedHashMap<>();

        for (Map<String, Object> row : rows) {
            String dist = (String) row.get("district");
            String store = (String) row.get("store_name");
            String category = (String) row.get("category_name");
            Double qty = ((Number) row.get("total_qty")).doubleValue();
            Double amount = ((Number) row.get("total_amount")).doubleValue();

            String key = dist + "|" + store;
            ClosingStockReportDTO dto = storeMap.computeIfAbsent(key, k -> new ClosingStockReportDTO(dist, store));
            dto.addCategoryData(category, qty, amount);
        }

        return new ArrayList<>(storeMap.values());
    }

    public ByteArrayInputStream exportToExcel(String zone, String district, String valuationMethod) throws IOException {
        List<String> columns = getDynamicColumns(zone, district);
        List<ClosingStockReportDTO> data = getReportData(zone, district, valuationMethod);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Closing Stock");

            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Row 0: District, Store Name, Category Headers (Merged), Total (Merged)
            Row row0 = sheet.createRow(0);
            Row row1 = sheet.createRow(1);
            int colIdx = 0;

            // District
            Cell cell = row0.createCell(colIdx);
            cell.setCellValue("District");
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 1, colIdx, colIdx));
            colIdx++;

            // Store Name
            cell = row0.createCell(colIdx);
            cell.setCellValue("Store Name");
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 1, colIdx, colIdx));
            colIdx++;

            // Dynamic Category Columns
            for (String col : columns) {
                cell = row0.createCell(colIdx);
                cell.setCellValue(col);
                cell.setCellStyle(headerStyle);
                sheet.addMergedRegion(new CellRangeAddress(0, 0, colIdx, colIdx + 1));
                
                // Sub-headers
                row1.createCell(colIdx).setCellValue("Qty");
                row1.createCell(colIdx + 1).setCellValue("Amt");
                
                colIdx += 2;
            }

            // Total Column
            cell = row0.createCell(colIdx);
            cell.setCellValue("Total");
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, colIdx, colIdx + 1));
            
            row1.createCell(colIdx).setCellValue("Qty");
            row1.createCell(colIdx + 1).setCellValue("Amt");


            // Data Rows
            int rowIdx = 2;
            for (ClosingStockReportDTO dto : data) {
                Row row = sheet.createRow(rowIdx++);
                colIdx = 0;
                row.createCell(colIdx++).setCellValue(dto.getDistrict());
                row.createCell(colIdx++).setCellValue(dto.getStoreName());

                for (String col : columns) {
                    Double qty = dto.getCategoryQuantities().getOrDefault(col, 0.0);
                    Double amount = dto.getCategoryAmounts().getOrDefault(col, 0.0);
                    row.createCell(colIdx++).setCellValue(qty);
                    row.createCell(colIdx++).setCellValue(amount);
                }
                row.createCell(colIdx++).setCellValue(dto.getTotalQty());
                row.createCell(colIdx++).setCellValue(dto.getTotalAmount());
            }
            
            // Grand Total Row
            Row totalRow = sheet.createRow(rowIdx);
            colIdx = 0;
            Cell totalLabel = totalRow.createCell(colIdx);
            totalLabel.setCellValue("GRAND TOTAL");
            totalLabel.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, 1));
            colIdx = 2; // Skip District and Store Name
            
            for (String col : columns) {
                double colQtySum = data.stream().mapToDouble(d -> d.getCategoryQuantities().getOrDefault(col, 0.0)).sum();
                double colAmtSum = data.stream().mapToDouble(d -> d.getCategoryAmounts().getOrDefault(col, 0.0)).sum();
                totalRow.createCell(colIdx++).setCellValue(colQtySum);
                totalRow.createCell(colIdx++).setCellValue(colAmtSum);
            }
            
            double grandTotalQty = data.stream().mapToDouble(ClosingStockReportDTO::getTotalQty).sum();
            double grandTotalAmount = data.stream().mapToDouble(ClosingStockReportDTO::getTotalAmount).sum();
            totalRow.createCell(colIdx++).setCellValue(grandTotalQty);
            totalRow.createCell(colIdx++).setCellValue(grandTotalAmount);

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }
}
