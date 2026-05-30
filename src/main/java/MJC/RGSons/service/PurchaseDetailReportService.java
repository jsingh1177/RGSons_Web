package MJC.RGSons.service;

import MJC.RGSons.dto.ItemPartyPurchaseDTO;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
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

    public List<Map<String, Object>> getPurchaseDetail(String startDate, String endDate, String storeCode, String district, String partyCode, String supplierName) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT * FROM ( ");
        sql.append("SELECT ");
        sql.append("  st.store_code AS storeCode, ");
        sql.append("  st.store_name AS storeName, ");
        sql.append("  CONVERT(varchar(10), pi.tran_date, 23) AS date, ");
        sql.append("  pi.invoice_no AS billNumber, ");
        sql.append("  ph.party_invoice_no AS partyInvoiceNo, ");
        sql.append("  p.name AS supplierName, ");
        sql.append("  COALESCE(NULLIF(i.item_name, ''), pi.item_code) AS itemName, ");
        sql.append("  COALESCE(NULLIF(sz.name, ''), pi.size_code) AS sizeName, ");
        sql.append("  SUM(COALESCE(pi.quantity, 0)) AS quantity, ");
        sql.append("  SUM(COALESCE(pi.amount, 0)) AS amount ");
        sql.append("FROM pur_item pi ");
        sql.append("JOIN pur_head ph ON ph.invoice_no = pi.invoice_no ");
        sql.append("JOIN store st ON st.store_code = pi.store_code ");
        sql.append("LEFT JOIN party p ON p.code = ph.party_code ");
        sql.append("LEFT JOIN items i ON i.item_code = pi.item_code ");
        sql.append("LEFT JOIN size sz ON sz.code = pi.size_code ");
        sql.append("WHERE ph.status = 'SUBMITTED' ");
        sql.append("AND pi.tran_date BETWEEN ? AND ? ");

        StringBuilder filterSql = new StringBuilder();
        List<Object> baseParams = new ArrayList<>();
        baseParams.add(startDate);
        baseParams.add(endDate);

        if (district != null && !district.isBlank()) {
            filterSql.append("AND st.district = ? ");
            baseParams.add(district);
        }
        if (storeCode != null && !storeCode.isBlank()) {
            filterSql.append("AND pi.store_code = ? ");
            baseParams.add(storeCode);
        }
        if (partyCode != null && !partyCode.isBlank()) {
            filterSql.append("AND ph.party_code = ? ");
            baseParams.add(partyCode);
        }
        if (supplierName != null && !supplierName.isBlank()) {
            filterSql.append("AND p.name LIKE ? ");
            baseParams.add("%" + supplierName.trim() + "%");
        }

        sql.append(filterSql);
        sql.append("GROUP BY st.store_code, st.store_name, pi.tran_date, pi.invoice_no, ph.party_invoice_no, p.name, COALESCE(NULLIF(i.item_name, ''), pi.item_code), COALESCE(NULLIF(sz.name, ''), pi.size_code) ");

        sql.append(" UNION ALL ");

        sql.append("SELECT ");
        sql.append("  st.store_code AS storeCode, ");
        sql.append("  st.store_name AS storeName, ");
        sql.append("  CONVERT(varchar(10), pl.tran_date, 23) AS date, ");
        sql.append("  pl.invoice_no AS billNumber, ");
        sql.append("  ph.party_invoice_no AS partyInvoiceNo, ");
        sql.append("  p.name AS supplierName, ");
        sql.append("  COALESCE(NULLIF(l.name, ''), pl.ledger_code) AS itemName, ");
        sql.append("  COALESCE(NULLIF(l.name, ''), pl.ledger_code) AS sizeName, ");
        sql.append("  CAST(0 AS int) AS quantity, ");
        sql.append("  SUM(COALESCE(pl.amount, 0)) AS amount ");
        sql.append("FROM pur_ledgers pl ");
        sql.append("JOIN pur_head ph ON ph.invoice_no = pl.invoice_no ");
        sql.append("JOIN store st ON st.store_code = pl.store_code ");
        sql.append("LEFT JOIN party p ON p.code = ph.party_code ");
        sql.append("LEFT JOIN ledgers l ON l.code = pl.ledger_code ");
        sql.append("WHERE ph.status = 'SUBMITTED' ");
        sql.append("AND pl.tran_date BETWEEN ? AND ? ");
        sql.append(filterSql.toString().replace("pi.store_code", "pl.store_code"));
        sql.append("GROUP BY st.store_code, st.store_name, pl.tran_date, pl.invoice_no, ph.party_invoice_no, p.name, COALESCE(NULLIF(l.name, ''), pl.ledger_code) ");

        sql.append(") a ");
        sql.append("ORDER BY TRY_CONVERT(DATE, a.date), a.supplierName, a.billNumber, a.itemName, a.sizeName ");

        List<Object> params = new ArrayList<>(baseParams);
        params.addAll(baseParams);

        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
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

    public ByteArrayInputStream exportPurchaseDetailToExcel(String startDate, String endDate, String storeCode, String district, String partyCode, String supplierName) throws IOException {
        List<Map<String, Object>> rows = getPurchaseDetail(startDate, endDate, storeCode, district, partyCode, supplierName);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Purchase Detail");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            DataFormat dataFormat = workbook.createDataFormat();
            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            CellStyle qtyStyle = workbook.createCellStyle();
            qtyStyle.setDataFormat(dataFormat.getFormat("#,##0"));

            int r = 0;
            Row headerRow = sheet.createRow(r++);

            String[] columns = new String[]{
                    "Store Code",
                    "Store Name",
                    "Date",
                    "Bill Number",
                    "Party Invoice#",
                    "Supplier Name",
                    "Item Name",
                    "Size Name",
                    "Quantity",
                    "Amount"
            };

            for (int c = 0; c < columns.length; c++) {
                Cell cell = headerRow.createCell(c);
                cell.setCellValue(columns[c]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = r;
            String currentBill = null;
            int invoiceQty = 0;
            double invoiceAmount = 0.0;
            Map<String, Object> invoiceFirstRow = null;

            for (Map<String, Object> m : rows) {
                String bill = m.get("billNumber") != null ? String.valueOf(m.get("billNumber")) : "";
                if (currentBill == null) {
                    currentBill = bill;
                    invoiceFirstRow = m;
                    invoiceQty = 0;
                    invoiceAmount = 0.0;
                } else if (!currentBill.equals(bill)) {
                    Row totalRow = sheet.createRow(rowNum++);
                    int tc = 0;
                    totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("storeCode") != null ? String.valueOf(invoiceFirstRow.get("storeCode")) : "");
                    totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("storeName") != null ? String.valueOf(invoiceFirstRow.get("storeName")) : "");
                    totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("date") != null ? String.valueOf(invoiceFirstRow.get("date")) : "");
                    totalRow.createCell(tc++).setCellValue(currentBill);
                    totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("partyInvoiceNo") != null ? String.valueOf(invoiceFirstRow.get("partyInvoiceNo")) : "");
                    totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("supplierName") != null ? String.valueOf(invoiceFirstRow.get("supplierName")) : "");
                    totalRow.createCell(tc++).setCellValue("Invoice Total");
                    totalRow.createCell(tc++).setCellValue("");
                    Cell tq = totalRow.createCell(tc++);
                    tq.setCellValue(invoiceQty);
                    tq.setCellStyle(qtyStyle);
                    Cell ta = totalRow.createCell(tc++);
                    ta.setCellValue(invoiceAmount);
                    ta.setCellStyle(amountStyle);

                    currentBill = bill;
                    invoiceFirstRow = m;
                    invoiceQty = 0;
                    invoiceAmount = 0.0;
                }

                Row rr = sheet.createRow(rowNum++);
                int c = 0;
                rr.createCell(c++).setCellValue(m.get("storeCode") != null ? String.valueOf(m.get("storeCode")) : "");
                rr.createCell(c++).setCellValue(m.get("storeName") != null ? String.valueOf(m.get("storeName")) : "");
                rr.createCell(c++).setCellValue(m.get("date") != null ? String.valueOf(m.get("date")) : "");
                rr.createCell(c++).setCellValue(m.get("billNumber") != null ? String.valueOf(m.get("billNumber")) : "");
                rr.createCell(c++).setCellValue(m.get("partyInvoiceNo") != null ? String.valueOf(m.get("partyInvoiceNo")) : "");
                rr.createCell(c++).setCellValue(m.get("supplierName") != null ? String.valueOf(m.get("supplierName")) : "");
                rr.createCell(c++).setCellValue(m.get("itemName") != null ? String.valueOf(m.get("itemName")) : "");
                rr.createCell(c++).setCellValue(m.get("sizeName") != null ? String.valueOf(m.get("sizeName")) : "");

                Integer quantity = m.get("quantity") != null ? ((Number) m.get("quantity")).intValue() : 0;
                Double amount = m.get("amount") != null ? ((Number) m.get("amount")).doubleValue() : 0.0;

                Cell q = rr.createCell(c++);
                q.setCellValue(quantity);
                q.setCellStyle(qtyStyle);

                Cell a = rr.createCell(c++);
                a.setCellValue(amount);
                a.setCellStyle(amountStyle);

                invoiceQty += quantity != null ? quantity : 0;
                invoiceAmount += amount != null ? amount : 0.0;
            }

            if (currentBill != null) {
                Row totalRow = sheet.createRow(rowNum++);
                int tc = 0;
                totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("storeCode") != null ? String.valueOf(invoiceFirstRow.get("storeCode")) : "");
                totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("storeName") != null ? String.valueOf(invoiceFirstRow.get("storeName")) : "");
                totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("date") != null ? String.valueOf(invoiceFirstRow.get("date")) : "");
                totalRow.createCell(tc++).setCellValue(currentBill);
                totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("partyInvoiceNo") != null ? String.valueOf(invoiceFirstRow.get("partyInvoiceNo")) : "");
                totalRow.createCell(tc++).setCellValue(invoiceFirstRow != null && invoiceFirstRow.get("supplierName") != null ? String.valueOf(invoiceFirstRow.get("supplierName")) : "");
                totalRow.createCell(tc++).setCellValue("Invoice Total");
                totalRow.createCell(tc++).setCellValue("");
                Cell tq = totalRow.createCell(tc++);
                tq.setCellValue(invoiceQty);
                tq.setCellStyle(qtyStyle);
                Cell ta = totalRow.createCell(tc++);
                ta.setCellValue(invoiceAmount);
                ta.setCellStyle(amountStyle);
            }

            for (int c = 0; c < columns.length; c++) {
                sheet.autoSizeColumn(c);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private static String purchaseDetailColumnLabel(String key) {
        if (key == null) return "";
        return switch (key) {
            case "date" -> "Date";
            case "billNumber" -> "Bill Number";
            case "storeCode" -> "Store Code";
            case "storeName" -> "Store Name";
            case "partyInvoiceNo" -> "Party Invoice#";
            case "supplierName" -> "Supplier Name";
            case "itemName" -> "Item Name";
            case "sizeName" -> "Size Name";
            case "quantity" -> "Quantity";
            case "amount" -> "Amount";
            default -> key;
        };
    }

    public ByteArrayInputStream exportPurchaseDetailViewToExcel(List<Map<String, Object>> rows, List<String> columns) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Purchase Detail");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            DataFormat dataFormat = workbook.createDataFormat();
            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            CellStyle qtyStyle = workbook.createCellStyle();
            qtyStyle.setDataFormat(dataFormat.getFormat("#,##0"));

            int r = 0;
            Row headerRow = sheet.createRow(r++);

            List<String> cols = (columns == null || columns.isEmpty())
                    ? List.of("storeCode", "storeName", "date", "billNumber", "partyInvoiceNo", "supplierName", "itemName", "sizeName", "quantity", "amount")
                    : columns.stream().filter(s -> s != null && !s.isBlank()).toList();

            for (int c = 0; c < cols.size(); c++) {
                Cell cell = headerRow.createCell(c);
                cell.setCellValue(purchaseDetailColumnLabel(cols.get(c)));
                cell.setCellStyle(headerStyle);
            }

            int rowNum = r;
            for (Map<String, Object> m : rows) {
                Row rr = sheet.createRow(rowNum++);
                for (int c = 0; c < cols.size(); c++) {
                    String key = cols.get(c);
                    if ("quantity".equalsIgnoreCase(key)) {
                        Object qObj = m.get("quantity");
                        int qVal = 0;
                        if (qObj instanceof Number) qVal = ((Number) qObj).intValue();
                        else if (qObj != null) {
                            try {
                                qVal = (int) Math.round(Double.parseDouble(String.valueOf(qObj)));
                            } catch (Exception ignored) {
                            }
                        }
                        Cell cell = rr.createCell(c);
                        cell.setCellValue(qVal);
                        cell.setCellStyle(qtyStyle);
                        continue;
                    }
                    if ("amount".equalsIgnoreCase(key)) {
                        Object aObj = m.get("amount");
                        double aVal = 0.0;
                        if (aObj instanceof Number) aVal = ((Number) aObj).doubleValue();
                        else if (aObj != null) {
                            try {
                                aVal = Double.parseDouble(String.valueOf(aObj));
                            } catch (Exception ignored) {
                            }
                        }
                        Cell cell = rr.createCell(c);
                        cell.setCellValue(aVal);
                        cell.setCellStyle(amountStyle);
                        continue;
                    }
                    Object v = m.get(key);
                    rr.createCell(c).setCellValue(v != null ? String.valueOf(v) : "");
                }
            }

            for (int c = 0; c < cols.size(); c++) {
                sheet.autoSizeColumn(c);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }
}
