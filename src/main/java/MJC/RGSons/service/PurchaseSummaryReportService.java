package MJC.RGSons.service;

import MJC.RGSons.dto.PurchaseSummaryDTO;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.Font;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class PurchaseSummaryReportService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public List<PurchaseSummaryDTO> getReport(String startDate, String endDate, String storeCode, String district) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  ph.store_code AS store_code, ");
        sql.append("  s.store_name AS store_name, ");
        sql.append("  ph.invoice_date AS invoice_date, ");
        sql.append("  ph.invoice_no AS bill_number, ");
        sql.append("  p.name AS supplier_name, ");
        sql.append("  SUM(COALESCE(pi.quantity, 0)) AS total_quantity, ");
        sql.append("  COALESCE(ph.total_amount, 0) AS amount ");
        sql.append("FROM pur_head ph ");
        sql.append("JOIN store s ON ph.store_code = s.store_code ");
        sql.append("LEFT JOIN party p ON ph.party_code = p.code ");
        sql.append("LEFT JOIN pur_item pi ON ph.invoice_no = pi.invoice_no ");
        sql.append("WHERE ph.status = 'SUBMITTED' ");
        sql.append("AND TRY_CONVERT(DATE, ph.invoice_date, 105) BETWEEN ? AND ? ");

        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(endDate);

        if (district != null && !district.isBlank()) {
            sql.append("AND s.district = ? ");
            params.add(district);
        }

        if (storeCode != null && !storeCode.isBlank()) {
            sql.append("AND ph.store_code = ? ");
            params.add(storeCode);
        }

        sql.append("GROUP BY ph.store_code, s.store_name, ph.invoice_date, ph.invoice_no, p.name, ph.total_amount ");
        sql.append("ORDER BY TRY_CONVERT(DATE, ph.invoice_date, 105), ph.invoice_no ");

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql.toString(), params.toArray());
        List<PurchaseSummaryDTO> result = new ArrayList<>();

        for (Map<String, Object> row : rows) {
            String sc = row.get("store_code") != null ? row.get("store_code").toString() : "";
            String sn = row.get("store_name") != null ? row.get("store_name").toString() : "";
            String date = row.get("invoice_date") != null ? row.get("invoice_date").toString() : "";
            String bill = row.get("bill_number") != null ? row.get("bill_number").toString() : "";
            String supplier = row.get("supplier_name") != null ? row.get("supplier_name").toString() : "";
            Integer qty = row.get("total_quantity") != null ? ((Number) row.get("total_quantity")).intValue() : 0;
            Double amt = row.get("amount") != null ? ((Number) row.get("amount")).doubleValue() : 0.0;

            result.add(new PurchaseSummaryDTO(sc, sn, date, bill, supplier, qty, amt));
        }

        return result;
    }

    public List<String> getDistricts() {
        String sql = "SELECT DISTINCT district FROM store WHERE district IS NOT NULL AND district <> '' ORDER BY district";
        return jdbcTemplate.queryForList(sql, String.class);
    }

    public ByteArrayInputStream exportToExcel(String startDate, String endDate, String storeCode, String district) throws IOException {
        List<PurchaseSummaryDTO> rows = getReport(startDate, endDate, storeCode, district);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Purchase Summary");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            DataFormat dataFormat = workbook.createDataFormat();
            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            String[] columns = {
                    "Store Code",
                    "Store Name",
                    "Date",
                    "Bill Number",
                    "Supplier Name",
                    "Total Quantity",
                    "Amount"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (PurchaseSummaryDTO dto : rows) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(dto.getStoreCode() != null ? dto.getStoreCode() : "");
                row.createCell(1).setCellValue(dto.getStoreName() != null ? dto.getStoreName() : "");
                row.createCell(2).setCellValue(dto.getDate() != null ? dto.getDate() : "");
                row.createCell(3).setCellValue(dto.getBillNumber() != null ? dto.getBillNumber() : "");
                row.createCell(4).setCellValue(dto.getSupplierName() != null ? dto.getSupplierName() : "");

                Cell qtyCell = row.createCell(5);
                qtyCell.setCellValue(dto.getTotalQuantity() != null ? dto.getTotalQuantity() : 0);

                Cell amtCell = row.createCell(6);
                amtCell.setCellValue(dto.getAmount() != null ? dto.getAmount() : 0.0);
                amtCell.setCellStyle(amountStyle);
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }
}
