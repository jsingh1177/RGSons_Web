package MJC.RGSons.service;

import MJC.RGSons.dto.ItemPartyPurchaseDTO;
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
public class PurchaseDetailReportService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public List<ItemPartyPurchaseDTO> getReport(String startDate, String endDate, String categoryCode, String partyCode) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  i.item_name AS item_name, ");
        sql.append("  p.name AS party_name, ");
        sql.append("  SUM(COALESCE(pi.quantity, 0)) AS qty, ");
        sql.append("  SUM(COALESCE(pi.amount, 0)) AS amt ");
        sql.append("FROM pur_head ph ");
        sql.append("JOIN pur_item pi ON ph.invoice_no = pi.invoice_no AND ph.store_code = pi.store_code AND ph.invoice_date = pi.invoice_date ");
        sql.append("LEFT JOIN items i ON pi.item_code = i.item_code ");
        sql.append("LEFT JOIN party p ON ph.party_code = p.code ");
        sql.append("WHERE ph.status = 'SUBMITTED' ");
        sql.append("AND TRY_CONVERT(DATE, ph.invoice_date, 105) BETWEEN ? AND ? ");

        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(endDate);

        if (categoryCode != null && !categoryCode.isBlank()) {
            sql.append("AND i.category_code = ? ");
            params.add(categoryCode);
        }

        if (partyCode != null && !partyCode.isBlank()) {
            sql.append("AND ph.party_code = ? ");
            params.add(partyCode);
        }

        sql.append("GROUP BY i.item_name, p.name ");
        sql.append("ORDER BY i.item_name, p.name ");

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql.toString(), params.toArray());
        List<ItemPartyPurchaseDTO> result = new ArrayList<>();

        for (Map<String, Object> row : rows) {
            String itemName = row.get("item_name") != null ? row.get("item_name").toString() : "";
            String partyName = row.get("party_name") != null ? row.get("party_name").toString() : "";
            Integer qty = row.get("qty") != null ? ((Number) row.get("qty")).intValue() : 0;
            Double amt = row.get("amt") != null ? ((Number) row.get("amt")).doubleValue() : 0.0;
            result.add(new ItemPartyPurchaseDTO(itemName, partyName, qty, amt));
        }

        return result;
    }

    public ByteArrayInputStream exportToExcel(String startDate, String endDate, String categoryCode, String partyCode) throws IOException {
        List<ItemPartyPurchaseDTO> rows = getReport(startDate, endDate, categoryCode, partyCode);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Item-Party Purchase");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            DataFormat dataFormat = workbook.createDataFormat();
            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            String[] columns = { "Item Name", "Party Name", "Qty", "Amt" };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (ItemPartyPurchaseDTO dto : rows) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(dto.getItemName() != null ? dto.getItemName() : "");
                row.createCell(1).setCellValue(dto.getPartyName() != null ? dto.getPartyName() : "");

                Cell qtyCell = row.createCell(2);
                qtyCell.setCellValue(dto.getQty() != null ? dto.getQty() : 0);

                Cell amtCell = row.createCell(3);
                amtCell.setCellValue(dto.getAmt() != null ? dto.getAmt() : 0.0);
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

