package MJC.RGSons.service;

import MJC.RGSons.dto.ClosingStockDetailedReportDTO;
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

    private java.time.LocalDate parseAsOnDate(String dateStr) {
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
        } catch (Exception ignored) {
        }
        return java.time.LocalDate.now();
    }

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

    public List<String> getDynamicColumns(String zone, String district, String asOnDate) {
        java.sql.Date asOnSql = java.sql.Date.valueOf(parseAsOnDate(asOnDate));
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT DISTINCT c.name ");
        sql.append("FROM ( ");
        sql.append("  SELECT store_code, item_code, size_code, ");
        sql.append("    SUM(COALESCE(Opening,0) + COALESCE(Purchase,0) + COALESCE(Transfer_In,0) - COALESCE(Transfer_Out,0) - COALESCE(Sale,0)) AS Closing ");
        sql.append("  FROM vw_InventoryClosing ");
        sql.append("  WHERE tran_date <= ? ");
        sql.append("  GROUP BY store_code, item_code, size_code ");
        sql.append(") ic ");
        sql.append("JOIN items i ON ic.item_code = i.item_code ");
        sql.append("JOIN category c ON i.category_code = c.code ");
        sql.append("JOIN store s ON ic.store_code = s.store_code ");
        sql.append("WHERE ic.Closing <> 0 ");

        List<Object> params = new ArrayList<>();
        params.add(asOnSql);
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

    public List<ClosingStockReportDTO> getReportData(String zone, String district, String asOnDate) {
        java.sql.Date asOnSql = java.sql.Date.valueOf(parseAsOnDate(asOnDate));

        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  s.district, ");
        sql.append("  s.store_name, ");
        sql.append("  c.name as category_name, ");

        sql.append("  SUM(CAST(ic.Closing AS DOUBLE PRECISION)) as total_qty, ");
        sql.append("  SUM(CAST(ic.Amount AS DOUBLE PRECISION)) as total_amount ");
        
        sql.append("FROM ( ");
        sql.append("  SELECT v.store_code, v.item_code, v.size_code, ");
        sql.append("    SUM(COALESCE(v.Opening,0) + COALESCE(v.Purchase,0) + COALESCE(v.Transfer_In,0) - COALESCE(v.Transfer_Out,0) - COALESCE(v.Sale,0)) AS Closing, ");
        sql.append("    SUM( ");
        sql.append("      CAST(COALESCE(v.Opening,0) AS DOUBLE PRECISION) * COALESCE(v.OP_Price,0) ");
        sql.append("      + CAST(COALESCE(v.Purchase,0) AS DOUBLE PRECISION) * COALESCE(v.P_Price,0) ");
        sql.append("      + CAST(COALESCE(v.Transfer_In,0) AS DOUBLE PRECISION) * COALESCE(v.TI_Price,0) ");
        sql.append("      - CAST(COALESCE(v.Transfer_Out,0) AS DOUBLE PRECISION) * COALESCE(v.TO_Price,0) ");
        sql.append("      - CAST(COALESCE(v.Sale,0) AS DOUBLE PRECISION) * COALESCE(v.S_PRICE,0) ");
        sql.append("    ) AS Amount ");
        sql.append("  FROM vw_InventoryClosing v ");
        sql.append("  WHERE v.tran_date <= ? ");
        sql.append("  GROUP BY v.store_code, v.item_code, v.size_code ");
        sql.append(") ic ");
        sql.append("JOIN store s ON ic.store_code = s.store_code ");
        sql.append("JOIN items i ON ic.item_code = i.item_code ");
        sql.append("JOIN category c ON i.category_code = c.code ");
        
        sql.append("WHERE ic.Closing <> 0 ");

        List<Object> params = new ArrayList<>();
        params.add(asOnSql);
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

// Updated for Excel Export
    public ClosingStockDetailedReportDTO getDetailedReportData(String storeCode, String asOnDate) {
        java.sql.Date asOnSql = java.sql.Date.valueOf(parseAsOnDate(asOnDate));

        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  s.district, ");
        sql.append("  s.store_name, ");
        sql.append("  c.name as category_name, ");
        sql.append("  i.item_code as item_code, ");
        sql.append("  i.item_name as Item_Name, ");
        sql.append("  ic.size_code as size_code, ");
        sql.append("  sz.name as Size_name, ");
        sql.append("  CAST(ic.Closing AS DOUBLE PRECISION) as qty, ");
        sql.append("  CAST(CASE WHEN ic.Closing <> 0 THEN ic.Amount / CAST(ic.Closing AS DOUBLE PRECISION) ELSE 0 END AS DOUBLE PRECISION) as rate, ");
        sql.append("  CAST(ic.Amount AS DOUBLE PRECISION) as amount ");
        
        sql.append("FROM ( ");
        sql.append("  SELECT LTRIM(RTRIM(v.store_code)) AS store_code, LTRIM(RTRIM(v.item_code)) AS item_code, LTRIM(RTRIM(COALESCE(v.size_code, ''))) AS size_code, ");
        sql.append("    SUM(COALESCE(v.Opening,0) + COALESCE(v.Purchase,0) + COALESCE(v.Transfer_In,0) - COALESCE(v.Transfer_Out,0) - COALESCE(v.Sale,0)) AS Closing, ");
        sql.append("    SUM( ");
        sql.append("      CAST(COALESCE(v.Opening,0) AS DOUBLE PRECISION) * COALESCE(v.OP_Price,0) ");
        sql.append("      + CAST(COALESCE(v.Purchase,0) AS DOUBLE PRECISION) * COALESCE(v.P_Price,0) ");
        sql.append("      + CAST(COALESCE(v.Transfer_In,0) AS DOUBLE PRECISION) * COALESCE(v.TI_Price,0) ");
        sql.append("      - CAST(COALESCE(v.Transfer_Out,0) AS DOUBLE PRECISION) * COALESCE(v.TO_Price,0) ");
        sql.append("      - CAST(COALESCE(v.Sale,0) AS DOUBLE PRECISION) * COALESCE(v.S_PRICE,0) ");
        sql.append("    ) AS Amount ");
        sql.append("  FROM vw_InventoryClosing v ");
        sql.append("  WHERE v.tran_date <= ? ");
        sql.append("  GROUP BY LTRIM(RTRIM(v.store_code)), LTRIM(RTRIM(v.item_code)), LTRIM(RTRIM(COALESCE(v.size_code, ''))) ");
        sql.append(") ic ");
        sql.append("JOIN store s ON LTRIM(RTRIM(ic.store_code)) = LTRIM(RTRIM(s.store_code)) ");
        sql.append("JOIN items i ON LTRIM(RTRIM(ic.item_code)) = LTRIM(RTRIM(i.item_code)) ");
        sql.append("JOIN category c ON i.category_code = c.code ");
        sql.append("LEFT JOIN size sz ON LTRIM(RTRIM(ic.size_code)) = LTRIM(RTRIM(sz.code)) ");
        
        sql.append("WHERE ic.Closing <> 0 ");
        
        List<Object> params = new ArrayList<>();
        params.add(asOnSql);
        if (storeCode != null && !storeCode.isEmpty()) {
            sql.append("AND LTRIM(RTRIM(ic.store_code)) = LTRIM(RTRIM(?)) ");
            params.add(storeCode);
        }

        sql.append("ORDER BY CASE WHEN c.Short_Order IS NULL OR c.Short_Order = 0 THEN 999999 ELSE c.Short_Order END, c.name, i.item_name, sz.short_order");

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql.toString(), params.toArray());

        ClosingStockDetailedReportDTO report = new ClosingStockDetailedReportDTO();
        report.setReportDate(parseAsOnDate(asOnDate).toString());

        if (!rows.isEmpty()) {
            report.setStoreName((String) rows.get(0).get("store_name"));
            report.setDistrict((String) rows.get(0).get("district"));
        }

        Map<String, ClosingStockDetailedReportDTO.CategoryGroup> categoryMap = new LinkedHashMap<>();
        Set<String> sizesSet = new LinkedHashSet<>();

        for (Map<String, Object> row : rows) {
            String categoryName = (String) row.get("category_name");
            String itemCode = (String) row.get("item_code");
            String itemName = (String) row.get("Item_Name");
            String sizeCode = (String) row.get("size_code");
            String sizeName = (String) row.get("Size_name");
            
            if (sizeName != null) {
                sizesSet.add(sizeName);
            }

            Double qty = ((Number) row.get("qty")).doubleValue();
            Double rate = ((Number) row.get("rate")).doubleValue();
            Double amount = row.get("amount") instanceof Number n ? n.doubleValue() : (qty * rate);

            ClosingStockDetailedReportDTO.CategoryGroup categoryGroup = categoryMap.computeIfAbsent(categoryName, k -> {
                ClosingStockDetailedReportDTO.CategoryGroup cg = new ClosingStockDetailedReportDTO.CategoryGroup();
                cg.setCategoryName(k);
                return cg;
            });

            ClosingStockDetailedReportDTO.ItemDetail itemDetail = new ClosingStockDetailedReportDTO.ItemDetail();
            itemDetail.setItemCode(itemCode);
            itemDetail.setItemName(itemName);
            itemDetail.setSizeCode(sizeCode);
            itemDetail.setSizeName(sizeName);
            itemDetail.setQty(qty);
            itemDetail.setRate(rate);
            itemDetail.setAmount(amount);

            categoryGroup.getItems().add(itemDetail);
            categoryGroup.setTotalQty(categoryGroup.getTotalQty() + qty);
            categoryGroup.setTotalAmount(categoryGroup.getTotalAmount() + amount);

            report.setGrandTotalQty(report.getGrandTotalQty() + qty);
            report.setGrandTotalAmount(report.getGrandTotalAmount() + amount);
        }

        report.setCategories(new ArrayList<>(categoryMap.values()));

        // Sort sizes based on Size table order
        List<String> sortedSizes = new ArrayList<>(sizesSet);
        try {
            Map<String, Integer> sizeOrderMap = getSizeOrderMap();
            sortedSizes.sort(Comparator.comparingInt(s -> sizeOrderMap.getOrDefault(s, Integer.MAX_VALUE)));
        } catch (Exception e) {
            System.err.println("Error sorting sizes in DTO: " + e.getMessage());
        }
        report.setSortedSizes(sortedSizes);

        return report;
    }

    public ByteArrayInputStream exportToExcel(String zone, String district, String storeCode, String asOnDate) throws IOException {
        if (storeCode != null && !storeCode.isEmpty()) {
            return exportDetailedToExcel(storeCode, asOnDate);
        }

        List<String> columns = getDynamicColumns(zone, district, asOnDate);
        List<ClosingStockReportDTO> data = getReportData(zone, district, asOnDate);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Closing Stock");

            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            
            CellStyle currencyStyle = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            currencyStyle.setDataFormat(format.getFormat("#,##0.00"));
            currencyStyle.setBorderBottom(BorderStyle.THIN);
            currencyStyle.setBorderTop(BorderStyle.THIN);
            currencyStyle.setBorderLeft(BorderStyle.THIN);
            currencyStyle.setBorderRight(BorderStyle.THIN);

            // Row 0: Title
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);

            String dateStr = parseAsOnDate(asOnDate).format(java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yyyy"));
            String titleText = "Closing Stock Report";
            if (zone != null && !zone.isEmpty()) titleText += " - Zone: " + zone;
            if (district != null && !district.isEmpty()) titleText += " - District: " + district;
            titleText += " As on : " + dateStr;

            titleCell.setCellValue(titleText);
            titleCell.setCellStyle(titleStyle);

            // Calculate total columns
            int totalCols = 2 + (columns.size() * 2) + 2; 
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, totalCols - 1));

            // Row 1: District, Store Name, Category Headers (Merged), Total (Merged)
            Row row1 = sheet.createRow(1);
            Row row2 = sheet.createRow(2);
            int colIdx = 0;

            // District
            Cell cell = row1.createCell(colIdx);
            cell.setCellValue("District");
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 2, colIdx, colIdx));
            colIdx++;

            // Store Name
            cell = row1.createCell(colIdx);
            cell.setCellValue("Store Name");
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 2, colIdx, colIdx));
            colIdx++;

            // Dynamic Category Columns
            for (String col : columns) {
                cell = row1.createCell(colIdx);
                cell.setCellValue(col);
                cell.setCellStyle(headerStyle);
                sheet.addMergedRegion(new CellRangeAddress(1, 1, colIdx, colIdx + 1));
                
                Cell subCell1 = row2.createCell(colIdx);
                subCell1.setCellValue("Qty");
                subCell1.setCellStyle(headerStyle);
                
                Cell subCell2 = row2.createCell(colIdx + 1);
                subCell2.setCellValue("Amt");
                subCell2.setCellStyle(headerStyle);
                
                colIdx += 2;
            }

            // Total Column
            cell = row1.createCell(colIdx);
            cell.setCellValue("Total");
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, colIdx, colIdx + 1));
            
            Cell subCell1 = row2.createCell(colIdx);
            subCell1.setCellValue("Qty");
            subCell1.setCellStyle(headerStyle);
            
            Cell subCell2 = row2.createCell(colIdx + 1);
            subCell2.setCellValue("Amt");
            subCell2.setCellStyle(headerStyle);


            // Data Rows
            int rowIdx = 3;
            for (ClosingStockReportDTO dto : data) {
                Row row = sheet.createRow(rowIdx++);
                colIdx = 0;
                row.createCell(colIdx++).setCellValue(dto.getDistrict());
                row.createCell(colIdx++).setCellValue(dto.getStoreName());

                for (String col : columns) {
                    Double qty = dto.getCategoryQuantities().getOrDefault(col, 0.0);
                    Double amount = dto.getCategoryAmounts().getOrDefault(col, 0.0);
                    row.createCell(colIdx++).setCellValue(qty);
                    Cell amtCell = row.createCell(colIdx++);
                    amtCell.setCellValue(amount);
                    amtCell.setCellStyle(currencyStyle);
                }
                row.createCell(colIdx++).setCellValue(dto.getTotalQty());
                Cell totalAmtCell = row.createCell(colIdx++);
                totalAmtCell.setCellValue(dto.getTotalAmount());
                totalAmtCell.setCellStyle(currencyStyle);
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
                Cell amtCell = totalRow.createCell(colIdx++);
                amtCell.setCellValue(colAmtSum);
                amtCell.setCellStyle(currencyStyle);
            }
            
            double grandTotalQty = data.stream().mapToDouble(ClosingStockReportDTO::getTotalQty).sum();
            double grandTotalAmount = data.stream().mapToDouble(ClosingStockReportDTO::getTotalAmount).sum();
            totalRow.createCell(colIdx++).setCellValue(grandTotalQty);
            Cell grandTotalAmtCell = totalRow.createCell(colIdx++);
            grandTotalAmtCell.setCellValue(grandTotalAmount);
            grandTotalAmtCell.setCellStyle(currencyStyle);

            // Auto-size columns
            for (int i = 0; i < colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private ByteArrayInputStream exportDetailedToExcel(String storeCode, String asOnDate) throws IOException {
        ClosingStockDetailedReportDTO data = getDetailedReportData(storeCode, asOnDate);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Detailed Closing Stock");

            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            
            CellStyle categoryStyle = workbook.createCellStyle();
            categoryStyle.setFont(font);
            categoryStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            categoryStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            categoryStyle.setBorderBottom(BorderStyle.THIN);
            categoryStyle.setBorderTop(BorderStyle.THIN);
            categoryStyle.setBorderLeft(BorderStyle.THIN);
            categoryStyle.setBorderRight(BorderStyle.THIN);

            CellStyle subTotalStyle = workbook.createCellStyle();
            subTotalStyle.setFont(font);
            subTotalStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            subTotalStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            subTotalStyle.setBorderBottom(BorderStyle.THIN);
            subTotalStyle.setBorderTop(BorderStyle.THIN);
            subTotalStyle.setBorderLeft(BorderStyle.THIN);
            subTotalStyle.setBorderRight(BorderStyle.THIN);

            CellStyle grandTotalStyle = workbook.createCellStyle();
            Font grandFont = workbook.createFont();
            grandFont.setBold(true);
            grandFont.setColor(IndexedColors.WHITE.getIndex());
            grandTotalStyle.setFont(grandFont);
            grandTotalStyle.setFillForegroundColor(IndexedColors.BLACK.getIndex());
            grandTotalStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            grandTotalStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle borderStyle = workbook.createCellStyle();
            borderStyle.setBorderBottom(BorderStyle.THIN);
            borderStyle.setBorderTop(BorderStyle.THIN);
            borderStyle.setBorderLeft(BorderStyle.THIN);
            borderStyle.setBorderRight(BorderStyle.THIN);

            CellStyle currencyStyle = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            currencyStyle.setDataFormat(format.getFormat("#,##0.00"));
            currencyStyle.setBorderBottom(BorderStyle.THIN);
            currencyStyle.setBorderTop(BorderStyle.THIN);
            currencyStyle.setBorderLeft(BorderStyle.THIN);
            currencyStyle.setBorderRight(BorderStyle.THIN);

            // 1. Get Sorted Sizes from DTO
            List<String> sizes = data.getSortedSizes();
            if (sizes == null) {
                sizes = new ArrayList<>();
            }

            // 2. Header Rows
            // Title Row (Row 0)
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            
            String dateStr = data.getReportDate();
            try {
                if (dateStr != null && dateStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                    java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
                    dateStr = date.format(java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yyyy"));
                }
            } catch (Exception e) {
                // Keep original if parse fails
            }

            titleCell.setCellValue("Closing Stock: " + (data.getStoreName() != null ? data.getStoreName() : "") + " As on : " + (dateStr != null ? dateStr : ""));
            titleCell.setCellStyle(titleStyle);
            
            // Calculate total columns for merging title
            int totalColsForMerge = 1 + (sizes.size() * 2) + 2; 
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, totalColsForMerge - 1));

            Row row1 = sheet.createRow(1);
            Row row2 = sheet.createRow(2);
            int colIdx = 0;

            // Item Name Column
            Cell cell = row1.createCell(colIdx);
            cell.setCellValue("Item Name & Size");
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 2, colIdx, colIdx));
            colIdx++;

            // Size Columns
            for (String size : sizes) {
                cell = row1.createCell(colIdx);
                cell.setCellValue(size);
                cell.setCellStyle(headerStyle);
                sheet.addMergedRegion(new CellRangeAddress(1, 1, colIdx, colIdx + 1));
                
                Cell subCell1 = row2.createCell(colIdx);
                subCell1.setCellValue("Qty");
                subCell1.setCellStyle(headerStyle);
                
                Cell subCell2 = row2.createCell(colIdx + 1);
                subCell2.setCellValue("Amt");
                subCell2.setCellStyle(headerStyle);
                
                colIdx += 2;
            }

            // Total Column
            cell = row1.createCell(colIdx);
            cell.setCellValue("Total");
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, colIdx, colIdx + 1));
            
            Cell subCell1 = row2.createCell(colIdx);
            subCell1.setCellValue("Qty");
            subCell1.setCellStyle(headerStyle);
            
            Cell subCell2 = row2.createCell(colIdx + 1);
            subCell2.setCellValue("Amt");
            subCell2.setCellStyle(headerStyle);

            int totalCols = colIdx + 2;
            int rowIdx = 3;

            // Grand Total Accumulators
            Map<String, Double> grandSizeQty = new HashMap<>();
            Map<String, Double> grandSizeAmt = new HashMap<>();
            double grandTotalQty = 0;
            double grandTotalAmt = 0;

            // 3. Iterate Categories
            if (data.getCategories() != null) {
                for (ClosingStockDetailedReportDTO.CategoryGroup cat : data.getCategories()) {
                    // Category Header
                    Row catRow = sheet.createRow(rowIdx++);
                    Cell catCell = catRow.createCell(0);
                    catCell.setCellValue(cat.getCategoryName());
                    catCell.setCellStyle(categoryStyle);
                    for (int i = 1; i < totalCols; i++) {
                        catRow.createCell(i).setCellStyle(categoryStyle);
                    }
                    sheet.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, totalCols - 1));

                    // Group Items by Name
                    Map<String, Map<String, ClosingStockDetailedReportDTO.ItemDetail>> itemMap = new LinkedHashMap<>();
                    for (ClosingStockDetailedReportDTO.ItemDetail item : cat.getItems()) {
                        itemMap.computeIfAbsent(item.getItemName(), k -> new HashMap<>()).put(item.getSizeName(), item);
                    }

                    // Category Subtotal Accumulators
                    Map<String, Double> catSizeQty = new HashMap<>();
                    Map<String, Double> catSizeAmt = new HashMap<>();
                    double catTotalQty = 0;
                    double catTotalAmt = 0;

                    // Write Item Rows
                    for (Map.Entry<String, Map<String, ClosingStockDetailedReportDTO.ItemDetail>> entry : itemMap.entrySet()) {
                        String itemName = entry.getKey();
                        Map<String, ClosingStockDetailedReportDTO.ItemDetail> sizeMap = entry.getValue();

                        Row row = sheet.createRow(rowIdx++);
                        colIdx = 0;
                        Cell itemCell = row.createCell(colIdx++);
                        itemCell.setCellValue(itemName);
                        itemCell.setCellStyle(borderStyle);

                        double rowTotalQty = 0;
                        double rowTotalAmt = 0;

                        for (String size : sizes) {
                            ClosingStockDetailedReportDTO.ItemDetail item = sizeMap.get(size);
                            double qty = item != null ? item.getQty() : 0;
                            double amt = item != null ? item.getAmount() : 0;

                            Cell qtyCell = row.createCell(colIdx++);
                            qtyCell.setCellValue(qty);
                            qtyCell.setCellStyle(borderStyle);

                            Cell amtCell = row.createCell(colIdx++);
                            amtCell.setCellValue(amt);
                            amtCell.setCellStyle(currencyStyle);

                            rowTotalQty += qty;
                            rowTotalAmt += amt;

                            catSizeQty.put(size, catSizeQty.getOrDefault(size, 0.0) + qty);
                            catSizeAmt.put(size, catSizeAmt.getOrDefault(size, 0.0) + amt);
                        }

                        Cell rowQtyCell = row.createCell(colIdx++);
                        rowQtyCell.setCellValue(rowTotalQty);
                        rowQtyCell.setCellStyle(borderStyle);

                        Cell rowAmtCell = row.createCell(colIdx++);
                        rowAmtCell.setCellValue(rowTotalAmt);
                        rowAmtCell.setCellStyle(currencyStyle);

                        catTotalQty += rowTotalQty;
                        catTotalAmt += rowTotalAmt;
                    }

                    // Category Subtotal Row
                    Row subRow = sheet.createRow(rowIdx++);
                    colIdx = 0;
                    Cell subLabel = subRow.createCell(colIdx++);
                    subLabel.setCellValue(cat.getCategoryName() + " Total");
                    subLabel.setCellStyle(subTotalStyle);

                    for (String size : sizes) {
                        Cell qtyCell = subRow.createCell(colIdx++);
                        qtyCell.setCellValue(catSizeQty.getOrDefault(size, 0.0));
                        qtyCell.setCellStyle(subTotalStyle);

                        Cell amtCell = subRow.createCell(colIdx++);
                        amtCell.setCellValue(catSizeAmt.getOrDefault(size, 0.0));
                        amtCell.setCellStyle(subTotalStyle);
                        // Apply currency format to subtotal amount if needed, but style overrides format. 
                        // Let's create a combined style or just use subTotalStyle (which is colored)
                        // Ideally we need currency format + color.
                        // For simplicity, keeping subTotalStyle (no currency format displayed but value is correct)
                        // Or I can clone style and add format.
                        // Let's manually set format for this cell
                        // amtCell.getCellStyle().setDataFormat(format.getFormat("#,##0.00")); // This modifies the shared style! Don't do this.
                        
                        grandSizeQty.put(size, grandSizeQty.getOrDefault(size, 0.0) + catSizeQty.getOrDefault(size, 0.0));
                        grandSizeAmt.put(size, grandSizeAmt.getOrDefault(size, 0.0) + catSizeAmt.getOrDefault(size, 0.0));
                    }

                    Cell catQtyCell = subRow.createCell(colIdx++);
                    catQtyCell.setCellValue(catTotalQty);
                    catQtyCell.setCellStyle(subTotalStyle);

                    Cell catAmtCell = subRow.createCell(colIdx++);
                    catAmtCell.setCellValue(catTotalAmt);
                    catAmtCell.setCellStyle(subTotalStyle);

                    grandTotalQty += catTotalQty;
                    grandTotalAmt += catTotalAmt;
                }
            }

            // Grand Total Row
            Row grandRow = sheet.createRow(rowIdx++);
            colIdx = 0;
            Cell grandLabel = grandRow.createCell(colIdx++);
            grandLabel.setCellValue("GRAND TOTAL");
            grandLabel.setCellStyle(grandTotalStyle);

            for (String size : sizes) {
                Cell qtyCell = grandRow.createCell(colIdx++);
                qtyCell.setCellValue(grandSizeQty.getOrDefault(size, 0.0));
                qtyCell.setCellStyle(grandTotalStyle);

                Cell amtCell = grandRow.createCell(colIdx++);
                amtCell.setCellValue(grandSizeAmt.getOrDefault(size, 0.0));
                amtCell.setCellStyle(grandTotalStyle);
            }

            Cell grandQtyCell = grandRow.createCell(colIdx++);
            grandQtyCell.setCellValue(grandTotalQty);
            grandQtyCell.setCellStyle(grandTotalStyle);

            Cell grandAmtCell = grandRow.createCell(colIdx++);
            grandAmtCell.setCellValue(grandTotalAmt);
            grandAmtCell.setCellStyle(grandTotalStyle);
            
            // Auto-size columns (be careful with performance, but for this report it's fine)
            for (int i = 0; i < totalCols; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private Map<String, Integer> getSizeOrderMap() {
        try {
            String sql = "SELECT name, short_order FROM size";
            return jdbcTemplate.query(sql, rs -> {
                Map<String, Integer> map = new HashMap<>();
                while (rs.next()) {
                    String name = rs.getString("name");
                    int order = rs.getInt("short_order");
                    if (rs.wasNull()) {
                        order = Integer.MAX_VALUE;
                    }
                    if (name != null) {
                        map.put(name.trim(), order);
                    }
                }
                return map;
            });
        } catch (Exception e) {
            System.err.println("Error fetching size order map: " + e.getMessage());
            return new HashMap<>();
        }
    }
}
