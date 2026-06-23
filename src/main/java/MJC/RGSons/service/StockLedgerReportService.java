package MJC.RGSons.service;

import MJC.RGSons.dto.StockLedgerEntryDTO;
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
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StockLedgerReportService {

    private static final LocalDate OPENING_BALANCE_DATE = LocalDate.of(2026, 4, 1);
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd-MMM-yyyy");
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_DATE;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String resolveStoreDisplay(String storeCode) {
        if (storeCode == null || storeCode.isBlank()) return "";
        try {
            String name = jdbcTemplate.queryForObject(
                    "SELECT TOP 1 store_name FROM store WHERE store_code = ?",
                    String.class,
                    storeCode
            );
            if (name == null || name.isBlank()) return storeCode;
            return storeCode + " - " + name;
        } catch (Exception e) {
            return storeCode;
        }
    }

    private String resolveItemDisplay(String itemCode) {
        if (itemCode == null || itemCode.isBlank()) return "";
        try {
            String name = jdbcTemplate.queryForObject(
                    "SELECT TOP 1 item_name FROM items WHERE item_code = ?",
                    String.class,
                    itemCode
            );
            if (name == null || name.isBlank()) return itemCode;
            return itemCode + " - " + name;
        } catch (Exception e) {
            return itemCode;
        }
    }

    public List<Map<String, String>> getStockItems(String storeCode, String categoryCode) {
        StringBuilder sql = new StringBuilder("""
                SELECT DISTINCT
                    vc.item_code AS itemCode,
                    it.item_name AS itemName
                FROM vw_InventoryClosing vc
                LEFT JOIN items it ON it.item_code = vc.item_code
                WHERE 1=1
                """);

        List<Object> params = new ArrayList<>();
        if (storeCode != null && !storeCode.isBlank()) {
            sql.append("""
                    AND (
                        vc.store_code = ?
                        OR (? = 'HO' AND vc.store_code IN ('HO', 'Head Office'))
                    )
                    """);
            params.add(storeCode);
            params.add(storeCode);
        }

        sql.append("""
                    AND (? IS NULL OR ? = '' OR it.category_code = ?)
                ORDER BY it.item_name
                """);

        params.add(categoryCode);
        params.add(categoryCode);
        params.add(categoryCode);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("itemCode", rs.getString("itemCode"));
            m.put("itemName", rs.getString("itemName"));
            return m;
        }, params.toArray());
    }

    public List<StockLedgerEntryDTO> getStockLedger(String storeCode, String itemCode, String sizeCode, String asOnDate) {
        LocalDate asOn = parseAsOnDate(asOnDate);
        Date openingDate = Date.valueOf(OPENING_BALANCE_DATE);
        Date asOnSql = Date.valueOf(asOn);
        StringBuilder sql = new StringBuilder("""
                WITH base AS (
                    SELECT
                        vc.tran_date AS tran_date,
                        vc.size_code AS size_code,
                        COALESCE(sz.name, vc.size_code, 'NA') AS size_name,
                        LTRIM(RTRIM(COALESCE(vc.Description, ''))) AS ref_no,
                        SUM(COALESCE(vc.Opening, 0)) AS opening_qty,
                        SUM(COALESCE(vc.Purchase, 0)) AS purchase_qty,
                        SUM(COALESCE(vc.Transfer_In, 0)) AS inward_qty,
                        SUM(COALESCE(vc.Transfer_Out, 0)) AS outward_qty,
                        SUM(COALESCE(vc.Sale, 0)) AS sale_qty
                    FROM vw_InventoryClosing vc
                    LEFT JOIN size sz ON sz.code = vc.size_code
                    WHERE 1=1
                """);

        List<Object> params = new ArrayList<>();
        if (storeCode != null && !storeCode.isBlank()) {
            sql.append("""
                        AND (
                            vc.store_code = ?
                            OR (? = 'HO' AND vc.store_code IN ('HO', 'Head Office'))
                        )
                    """);
            params.add(storeCode);
            params.add(storeCode);
        }

        sql.append("""
                        AND vc.item_code = ?
                        AND vc.tran_date BETWEEN ? AND ?
                        AND (? IS NULL OR ? = '' OR COALESCE(vc.size_code, '') = COALESCE(?, ''))
                    GROUP BY
                        vc.tran_date,
                        vc.size_code,
                        sz.name,
                        vc.Description
                ),
                movements AS (
                    SELECT
                        tran_date,
                        ref_no,
                        '' AS extra_info,
                        CASE
                            WHEN opening_qty <> 0 THEN 'OPENING'
                            WHEN purchase_qty <> 0 THEN 'PURCHASE'
                            WHEN inward_qty <> 0 THEN 'INWARD'
                            WHEN outward_qty <> 0 THEN 'OUTWARD'
                            WHEN sale_qty <> 0 THEN 'SALE'
                            ELSE 'OTHER'
                        END AS movement_type,
                        CASE
                            WHEN ref_no IS NULL OR ref_no = '' THEN NULL
                            WHEN ref_no = 'Opening Balance' THEN NULL
                            WHEN CHARINDEX(':', ref_no) > 0 THEN LEFT(ref_no, CHARINDEX(':', ref_no) - 1)
                            ELSE ref_no
                        END AS voucher_no,
                        COALESCE(size_code, '') AS size_code,
                        size_name,
                        COALESCE(opening_qty, 0) AS opening_qty,
                        COALESCE(purchase_qty, 0) AS purchase_qty,
                        COALESCE(inward_qty, 0) AS inward_qty,
                        COALESCE(outward_qty, 0) AS outward_qty,
                        COALESCE(sale_qty, 0) AS sale_qty,
                        CASE
                            WHEN opening_qty <> 0 THEN 0
                            WHEN purchase_qty <> 0 THEN 1
                            WHEN inward_qty <> 0 THEN 2
                            WHEN outward_qty <> 0 THEN 3
                            WHEN sale_qty <> 0 THEN 4
                            ELSE 5
                        END AS sort_order,
                        (COALESCE(opening_qty, 0) + COALESCE(purchase_qty, 0) + COALESCE(inward_qty, 0) - COALESCE(outward_qty, 0) - COALESCE(sale_qty, 0)) AS net_qty
                    FROM base
                ),
                ledger AS (
                    SELECT
                        m.tran_date,
                        m.ref_no AS description,
                        m.extra_info,
                        m.movement_type,
                        m.voucher_no,
                        m.size_code,
                        m.size_name,
                        m.opening_qty,
                        m.purchase_qty,
                        m.inward_qty,
                        m.outward_qty,
                        m.sale_qty,
                        m.sort_order,
                        COALESCE(TRY_CONVERT(float, pm.Purchase_Price), 0) AS purchase_price,
                        SUM(net_qty) OVER (
                            PARTITION BY m.size_code
                            ORDER BY m.tran_date, m.sort_order, COALESCE(m.voucher_no, ''), COALESCE(m.ref_no, '')
                            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                        ) AS balance_qty
                    FROM movements m
                    LEFT JOIN Price_Master pm
                        ON pm.Item_Code = ?
                        AND COALESCE(pm.Size_Code, '') = COALESCE(m.size_code, '')
                    WHERE tran_date IS NOT NULL
                )
                SELECT
                    tran_date,
                    description,
                    extra_info,
                    movement_type,
                    voucher_no,
                    size_code,
                    size_name,
                    opening_qty,
                    purchase_qty,
                    inward_qty,
                    outward_qty,
                    sale_qty,
                    balance_qty,
                    purchase_price,
                    (CONVERT(float, opening_qty) * purchase_price) AS opening_amount,
                    (CONVERT(float, purchase_qty) * purchase_price) AS purchase_amount,
                    (CONVERT(float, inward_qty) * purchase_price) AS inward_amount,
                    (CONVERT(float, outward_qty) * purchase_price) AS outward_amount,
                    (CONVERT(float, sale_qty) * purchase_price) AS sale_amount,
                    (CONVERT(float, balance_qty) * purchase_price) AS balance_amount
                FROM ledger
                ORDER BY size_name, tran_date, sort_order, COALESCE(voucher_no, ''), COALESCE(description, '')
                """);

        params.add(itemCode);
        params.add(openingDate);
        params.add(asOnSql);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(itemCode);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            Date d = rs.getDate("tran_date");
            String displayDate;
            if (d == null) {
                displayDate = "";
            } else {
                LocalDate ld = d.toLocalDate();
                if (OPENING_BALANCE_DATE.equals(ld)) {
                    displayDate = "01-Apr-2026";
                } else {
                    displayDate = DISPLAY_DATE.format(ld);
                }
            }

            return new StockLedgerEntryDTO(
                    displayDate,
                    rs.getString("description"),
                    rs.getString("extra_info"),
                    rs.getString("size_name"),
                    rs.getString("size_code"),
                    rs.getString("movement_type"),
                    rs.getString("voucher_no"),
                    rs.getInt("opening_qty"),
                    rs.getInt("purchase_qty"),
                    rs.getInt("inward_qty"),
                    rs.getInt("outward_qty"),
                    rs.getInt("sale_qty"),
                    rs.getInt("balance_qty"),
                    rs.getDouble("purchase_price"),
                    rs.getDouble("opening_amount"),
                    rs.getDouble("purchase_amount"),
                    rs.getDouble("inward_amount"),
                    rs.getDouble("outward_amount"),
                    rs.getDouble("sale_amount"),
                    rs.getDouble("balance_amount")
            );
        }, params.toArray());
    }

    public byte[] exportStockLedgerToExcel(String storeCode, String itemCode, String sizeCode, String asOnDate) {
        List<StockLedgerEntryDTO> rows = getStockLedger(storeCode, itemCode, sizeCode, asOnDate);

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Stock Ledger");

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

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle borderStyle = workbook.createCellStyle();
            borderStyle.setBorderBottom(BorderStyle.THIN);
            borderStyle.setBorderTop(BorderStyle.THIN);
            borderStyle.setBorderLeft(BorderStyle.THIN);
            borderStyle.setBorderRight(BorderStyle.THIN);

            DataFormat format = workbook.createDataFormat();
            CellStyle numberStyle = workbook.createCellStyle();
            numberStyle.cloneStyleFrom(borderStyle);
            numberStyle.setDataFormat(format.getFormat("#,##0"));

            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.cloneStyleFrom(borderStyle);
            amountStyle.setDataFormat(format.getFormat("#,##0.00"));

            int r = 0;
            Row titleRow = sheet.createRow(r++);
            titleRow.setHeightInPoints(30);

            String[] cols = new String[]{
                    "Date",
                    "Description",
                    "Size",
                    "Opening Qty",
                    "Opening Amt",
                    "Purchase Qty",
                    "Purchase Amt",
                    "Inward Qty",
                    "Inward Amt",
                    "Outward Qty",
                    "Outward Amt",
                    "Sale Qty",
                    "Sale Amt",
                    "Balance Qty",
                    "Balance Amt"
            };

            LocalDate asOn = parseAsOnDate(asOnDate);
            String titleText = "Stock Ledger";
            if (storeCode == null || storeCode.isBlank()) {
                titleText += " - Store: ALL";
            } else {
                titleText += " - Store: " + resolveStoreDisplay(storeCode);
            }
            if (itemCode != null && !itemCode.isBlank()) {
                titleText += " - Item: " + resolveItemDisplay(itemCode);
            }
            if (sizeCode != null && !sizeCode.isBlank()) {
                titleText += " - Size: " + sizeCode;
            }
            titleText += " As on : " + DISPLAY_DATE.format(asOn);

            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(titleText);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, cols.length - 1));

            Row header = sheet.createRow(r++);
            header.setHeightInPoints(20);
            for (int c = 0; c < cols.length; c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(cols[c]);
                cell.setCellStyle(headerStyle);
            }

            for (StockLedgerEntryDTO e : rows) {
                Row row = sheet.createRow(r++);
                int c = 0;

                Cell dateCell = row.createCell(c++);
                dateCell.setCellValue(e.getDate() != null ? e.getDate() : "");
                dateCell.setCellStyle(borderStyle);

                Cell descCell = row.createCell(c++);
                String baseDesc = (e.getDescription() != null && !e.getDescription().isBlank())
                        ? e.getDescription()
                        : (e.getVoucherNo() != null ? e.getVoucherNo() : "");
                String extra = e.getExtraInfo() != null ? e.getExtraInfo().trim() : "";
                descCell.setCellValue(extra.isEmpty() ? baseDesc : (baseDesc + " - " + extra));
                descCell.setCellStyle(borderStyle);

                Cell sizeNameCell = row.createCell(c++);
                sizeNameCell.setCellValue(e.getSizeName() != null ? e.getSizeName() : "");
                sizeNameCell.setCellStyle(borderStyle);

                Cell openingCell = row.createCell(c++);
                openingCell.setCellValue(e.getOpeningQty() != null ? e.getOpeningQty() : 0);
                openingCell.setCellStyle(numberStyle);

                Cell openingAmtCell = row.createCell(c++);
                openingAmtCell.setCellValue(e.getOpeningAmount() != null ? e.getOpeningAmount() : 0.0);
                openingAmtCell.setCellStyle(amountStyle);

                Cell purchaseCell = row.createCell(c++);
                purchaseCell.setCellValue(e.getPurchaseQty() != null ? e.getPurchaseQty() : 0);
                purchaseCell.setCellStyle(numberStyle);

                Cell purchaseAmtCell = row.createCell(c++);
                purchaseAmtCell.setCellValue(e.getPurchaseAmount() != null ? e.getPurchaseAmount() : 0.0);
                purchaseAmtCell.setCellStyle(amountStyle);

                Cell inwardCell = row.createCell(c++);
                inwardCell.setCellValue(e.getInwardQty() != null ? e.getInwardQty() : 0);
                inwardCell.setCellStyle(numberStyle);

                Cell inwardAmtCell = row.createCell(c++);
                inwardAmtCell.setCellValue(e.getInwardAmount() != null ? e.getInwardAmount() : 0.0);
                inwardAmtCell.setCellStyle(amountStyle);

                Cell outwardCell = row.createCell(c++);
                outwardCell.setCellValue(e.getOutwardQty() != null ? e.getOutwardQty() : 0);
                outwardCell.setCellStyle(numberStyle);

                Cell outwardAmtCell = row.createCell(c++);
                outwardAmtCell.setCellValue(e.getOutwardAmount() != null ? e.getOutwardAmount() : 0.0);
                outwardAmtCell.setCellStyle(amountStyle);

                Cell saleCell = row.createCell(c++);
                saleCell.setCellValue(e.getSaleQty() != null ? e.getSaleQty() : 0);
                saleCell.setCellStyle(numberStyle);

                Cell saleAmtCell = row.createCell(c++);
                saleAmtCell.setCellValue(e.getSaleAmount() != null ? e.getSaleAmount() : 0.0);
                saleAmtCell.setCellStyle(amountStyle);

                Cell balCell = row.createCell(c++);
                balCell.setCellValue(e.getBalanceQty() != null ? e.getBalanceQty() : 0);
                balCell.setCellStyle(numberStyle);

                Cell balAmtCell = row.createCell(c++);
                balAmtCell.setCellValue(e.getBalanceAmount() != null ? e.getBalanceAmount() : 0.0);
                balAmtCell.setCellStyle(amountStyle);
            }

            for (int c = 0; c < cols.length; c++) {
                sheet.autoSizeColumn(c);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export Stock Ledger", e);
        }
    }

    private LocalDate parseAsOnDate(String asOnDate) {
        if (asOnDate == null || asOnDate.isBlank()) return LocalDate.now();
        try {
            return LocalDate.parse(asOnDate.trim(), ISO_DATE);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }
}
