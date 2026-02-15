package MJC.RGSons.service;

import MJC.RGSons.dto.CollectionExpenseDTO;
import MJC.RGSons.model.Ledger;
import MJC.RGSons.repository.LedgerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CollectionExpenseReportService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private LedgerRepository ledgerRepository;

    public List<CollectionExpenseDTO> getReport(String startDate, String endDate, String zone, String district) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  s.district, ");
        sql.append("  s.store_name, ");
        sql.append("  l.name as ledger_name, ");
        sql.append("  tl.type as tran_type, "); // Use transaction type (Tender/Expense)
        sql.append("  SUM(tl.amount) as amount ");
        
        sql.append("FROM tran_ledgers tl ");
        sql.append("JOIN store s ON tl.store_code = s.store_code ");
        sql.append("JOIN ledgers l ON tl.ledger_code = l.code ");
        // Correct date filtering using TRY_CONVERT
        sql.append("WHERE TRY_CONVERT(DATE, tl.invoice_date, 105) BETWEEN ? AND ? ");

        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(endDate);

        if (zone != null && !zone.isEmpty()) {
            sql.append("AND s.zone = ? ");
            params.add(zone);
        }

        if (district != null && !district.isEmpty()) {
            sql.append("AND s.district = ? ");
            params.add(district);
        }

        // Group by District, Store, Ledger Name, and Type
        sql.append("GROUP BY s.district, s.store_name, l.name, tl.type ");
        sql.append("ORDER BY s.district, s.store_name");

        // Execute query
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql.toString(), params.toArray());

        // Process result into DTOs
        Map<String, CollectionExpenseDTO> dtoMap = new HashMap<>();

        for (Map<String, Object> row : rows) {
            String dist = (String) row.get("district");
            String store = (String) row.get("store_name");
            String key = dist + "|" + store;

            CollectionExpenseDTO dto = dtoMap.computeIfAbsent(key, k -> new CollectionExpenseDTO(dist, store));

            String ledgerName = (String) row.get("ledger_name");
            String type = (String) row.get("tran_type");
            Double amount = row.get("amount") != null ? ((Number) row.get("amount")).doubleValue() : 0.0;

            if ("Tender".equalsIgnoreCase(type)) {
                dto.addTender(ledgerName, amount);
            } else if ("Expense".equalsIgnoreCase(type)) {
                dto.addExpense(ledgerName, amount);
            } else if ("Other Sale".equalsIgnoreCase(type) || "Sale".equalsIgnoreCase(type)) {
                dto.addSale(ledgerName, amount);
            }
        }

        // Fetch Goods Sale from tran_head
        StringBuilder sqlGoods = new StringBuilder();
        sqlGoods.append("SELECT ");
        sqlGoods.append("  s.district, ");
        sqlGoods.append("  s.store_name, ");
        sqlGoods.append("  SUM(th.sale_amount) as amount ");
        sqlGoods.append("FROM tran_head th ");
        sqlGoods.append("JOIN store s ON th.store_code = s.store_code ");
        sqlGoods.append("WHERE TRY_CONVERT(DATE, th.invoice_date, 105) BETWEEN ? AND ? ");

        List<Object> paramsGoods = new ArrayList<>();
        paramsGoods.add(startDate);
        paramsGoods.add(endDate);

        if (zone != null && !zone.isEmpty()) {
            sqlGoods.append("AND s.zone = ? ");
            paramsGoods.add(zone);
        }

        if (district != null && !district.isEmpty()) {
            sqlGoods.append("AND s.district = ? ");
            paramsGoods.add(district);
        }

        sqlGoods.append("GROUP BY s.district, s.store_name");

        List<Map<String, Object>> goodsRows = jdbcTemplate.queryForList(sqlGoods.toString(), paramsGoods.toArray());

        for (Map<String, Object> row : goodsRows) {
            String dist = (String) row.get("district");
            String store = (String) row.get("store_name");
            Double amount = row.get("amount") != null ? ((Number) row.get("amount")).doubleValue() : 0.0;

            String key = dist + "|" + store;
            CollectionExpenseDTO dto = dtoMap.computeIfAbsent(key, k -> new CollectionExpenseDTO(dist, store));
            dto.addSale("Goods Sale", amount);
        }

        // Return values sorted by District and Store Name
        return dtoMap.values().stream()
                .sorted((a, b) -> {
                    int distComp = a.getDistrict().compareTo(b.getDistrict());
                    if (distComp != 0) return distComp;
                    return a.getStoreName().compareTo(b.getStoreName());
                })
                .collect(Collectors.toList());
    }

    private List<String> sortLedgerNamesByShortOrder(List<Ledger> ledgers) {
        return ledgers.stream()
                .sorted((a, b) -> {
                    int orderA = (a.getShortOrder() != null && a.getShortOrder() > 0) ? a.getShortOrder() : Integer.MAX_VALUE;
                    int orderB = (b.getShortOrder() != null && b.getShortOrder() > 0) ? b.getShortOrder() : Integer.MAX_VALUE;
                    if (orderA != orderB) {
                        return Integer.compare(orderA, orderB);
                    }
                    String nameA = a.getName() != null ? a.getName() : "";
                    String nameB = b.getName() != null ? b.getName() : "";
                    return nameA.compareToIgnoreCase(nameB);
                })
                .map(Ledger::getName)
                .distinct()
                .collect(Collectors.toList());
    }

    public Map<String, List<String>> getReportColumns() {
        Map<String, List<String>> columns = new HashMap<>();
        
        List<Ledger> tenderLedgers = ledgerRepository.findByType("Tender");
        List<Ledger> expenseLedgers = ledgerRepository.findByType("Expense");
        List<Ledger> saleLedgers = ledgerRepository.findByType("Sale");

        List<String> tenderColumns = sortLedgerNamesByShortOrder(tenderLedgers);
        List<String> expenseColumns = sortLedgerNamesByShortOrder(expenseLedgers);
        List<String> saleLedgerColumns = sortLedgerNamesByShortOrder(saleLedgers);
        
        List<String> saleColumns = new ArrayList<>();
        saleColumns.add("Goods Sale");
        saleColumns.addAll(saleLedgerColumns);
        columns.put("sales", saleColumns);
        columns.put("tenders", tenderColumns);
        columns.put("expenses", expenseColumns);
        
        return columns;
    }

    public List<String> getZones() {
        return jdbcTemplate.queryForList("SELECT DISTINCT zone FROM store WHERE zone IS NOT NULL ORDER BY zone", String.class);
    }

    public List<String> getDistricts(String zone) {
        if (zone != null && !zone.isEmpty()) {
            return jdbcTemplate.queryForList("SELECT DISTINCT district FROM store WHERE zone = ? AND district IS NOT NULL ORDER BY district", String.class, zone);
        }
        return jdbcTemplate.queryForList("SELECT DISTINCT district FROM store WHERE district IS NOT NULL ORDER BY district", String.class);
    }

    public ByteArrayInputStream exportReport(String startDate, String endDate, String zone, String district) throws IOException {
        List<CollectionExpenseDTO> reportData = getReport(startDate, endDate, zone, district);
        Map<String, List<String>> columns = getReportColumns();
        List<String> tenderCols = columns.get("tenders");
        List<String> expenseCols = columns.get("expenses");
        List<String> saleCols = columns.get("sales");

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("CollectionExpenseReport");

            // Header Styles
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

            // Title Style
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Calculate total columns
            int totalColumns = 2 + 
                (saleCols.isEmpty() ? 0 : saleCols.size() + 1) + 
                (expenseCols.isEmpty() ? 0 : expenseCols.size() + 1) + 
                (tenderCols.isEmpty() ? 0 : tenderCols.size() + 1);

            // Row 0: Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Collection & Expense Report from " + startDate + " to " + endDate);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, totalColumns - 1));

            // Row 1: Main Headers
            Row headerRow0 = sheet.createRow(1);
            Row headerRow1 = sheet.createRow(2);

            // District
            Cell cell0 = headerRow0.createCell(0);
            cell0.setCellValue("District");
            cell0.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 2, 0, 0));

            // Store Name
            Cell cell1 = headerRow0.createCell(1);
            cell1.setCellValue("Store Name");
            cell1.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 2, 1, 1));

            int colIdx = 2;

            // Sales (Before Tender)
            if (!saleCols.isEmpty()) {
                Cell cellSale = headerRow0.createCell(colIdx);
                cellSale.setCellValue("SALE");
                cellSale.setCellStyle(headerStyle);
                sheet.addMergedRegion(new CellRangeAddress(1, 1, colIdx, colIdx + saleCols.size()));

                for (String sale : saleCols) {
                    Cell subCell = headerRow1.createCell(colIdx++);
                    subCell.setCellValue(sale.toUpperCase());
                    subCell.setCellStyle(headerStyle);
                }
                Cell subCell = headerRow1.createCell(colIdx++);
                subCell.setCellValue("TOTAL");
                subCell.setCellStyle(headerStyle);
            }

            // Expenses
            if (!expenseCols.isEmpty()) {
                Cell cellExpense = headerRow0.createCell(colIdx);
                cellExpense.setCellValue("EXPENSES");
                cellExpense.setCellStyle(headerStyle);
                sheet.addMergedRegion(new CellRangeAddress(1, 1, colIdx, colIdx + expenseCols.size()));

                for (String expense : expenseCols) {
                    Cell subCell = headerRow1.createCell(colIdx++);
                    subCell.setCellValue(expense.toUpperCase());
                    subCell.setCellStyle(headerStyle);
                }
                Cell subCell = headerRow1.createCell(colIdx++);
                subCell.setCellValue("TOTAL");
                subCell.setCellStyle(headerStyle);
            }

            // Tenders
            if (!tenderCols.isEmpty()) {
                Cell cellTender = headerRow0.createCell(colIdx);
                cellTender.setCellValue("TENDER");
                cellTender.setCellStyle(headerStyle);
                sheet.addMergedRegion(new CellRangeAddress(1, 1, colIdx, colIdx + tenderCols.size()));

                for (String tender : tenderCols) {
                    Cell subCell = headerRow1.createCell(colIdx++);
                    subCell.setCellValue(tender.toUpperCase());
                    subCell.setCellStyle(headerStyle);
                }
                Cell subCell = headerRow1.createCell(colIdx++);
                subCell.setCellValue("TOTAL");
                subCell.setCellStyle(headerStyle);
            }

            // Data Rows
            int rowIdx = 3;
            for (CollectionExpenseDTO dto : reportData) {
                Row row = sheet.createRow(rowIdx++);
                colIdx = 0;

                row.createCell(colIdx++).setCellValue(dto.getDistrict());
                row.createCell(colIdx++).setCellValue(dto.getStoreName());

                if (!saleCols.isEmpty()) {
                    double rowSum = 0;
                    for (String sale : saleCols) {
                        Double amount = dto.getSales().getOrDefault(sale, 0.0);
                        row.createCell(colIdx++).setCellValue(amount);
                        rowSum += amount;
                    }
                    row.createCell(colIdx++).setCellValue(rowSum);
                }

                if (!expenseCols.isEmpty()) {
                    double rowSum = 0;
                    for (String expense : expenseCols) {
                        Double amount = dto.getExpenses().getOrDefault(expense, 0.0);
                        row.createCell(colIdx++).setCellValue(amount);
                        rowSum += amount;
                    }
                    row.createCell(colIdx++).setCellValue(rowSum);
                }

                if (!tenderCols.isEmpty()) {
                    double rowSum = 0;
                    for (String tender : tenderCols) {
                        Double amount = dto.getTenders().getOrDefault(tender, 0.0);
                        row.createCell(colIdx++).setCellValue(amount);
                        rowSum += amount;
                    }
                    row.createCell(colIdx++).setCellValue(rowSum);
                }
            }

            // Totals Row
            Row totalRow = sheet.createRow(rowIdx);
            Cell totalLabel = totalRow.createCell(1);
            totalLabel.setCellValue("TOTAL");
            totalLabel.setCellStyle(headerStyle);
            
            colIdx = 2;
            if (!saleCols.isEmpty()) {
                double groupTotal = 0;
                for (String sale : saleCols) {
                    double sum = reportData.stream().mapToDouble(d -> d.getSales().getOrDefault(sale, 0.0)).sum();
                    Cell cell = totalRow.createCell(colIdx++);
                    cell.setCellValue(sum);
                    cell.setCellStyle(headerStyle);
                    groupTotal += sum;
                }
                Cell cell = totalRow.createCell(colIdx++);
                cell.setCellValue(groupTotal);
                cell.setCellStyle(headerStyle);
            }

            if (!expenseCols.isEmpty()) {
                double groupTotal = 0;
                for (String expense : expenseCols) {
                    double sum = reportData.stream().mapToDouble(d -> d.getExpenses().getOrDefault(expense, 0.0)).sum();
                    Cell cell = totalRow.createCell(colIdx++);
                    cell.setCellValue(sum);
                    cell.setCellStyle(headerStyle);
                    groupTotal += sum;
                }
                Cell cell = totalRow.createCell(colIdx++);
                cell.setCellValue(groupTotal);
                cell.setCellStyle(headerStyle);
            }

            if (!tenderCols.isEmpty()) {
                double groupTotal = 0;
                for (String tender : tenderCols) {
                    double sum = reportData.stream().mapToDouble(d -> d.getTenders().getOrDefault(tender, 0.0)).sum();
                    Cell cell = totalRow.createCell(colIdx++);
                    cell.setCellValue(sum);
                    cell.setCellStyle(headerStyle);
                    groupTotal += sum;
                }
                Cell cell = totalRow.createCell(colIdx++);
                cell.setCellValue(groupTotal);
                cell.setCellStyle(headerStyle);
            }

            // Auto-size columns
            for (int i = 0; i < colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }
}
