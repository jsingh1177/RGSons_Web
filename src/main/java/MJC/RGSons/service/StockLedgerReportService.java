package MJC.RGSons.service;

import MJC.RGSons.dto.StockLedgerEntryDTO;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
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

    public List<Map<String, String>> getStockItems(String storeCode, String categoryCode) {
        String sql = """
                SELECT DISTINCT
                    vc.item_code AS itemCode,
                    it.item_name AS itemName
                FROM vw_InventoryClosing vc
                LEFT JOIN items it ON it.item_code = vc.item_code
                WHERE
                    (
                        vc.store_code = ?
                        OR (? = 'HO' AND vc.store_code IN ('HO', 'Head Office'))
                    )
                    AND (? IS NULL OR ? = '' OR it.category_code = ?)
                ORDER BY it.item_name
                """;

        List<Object> params = new ArrayList<>();
        params.add(storeCode);
        params.add(storeCode);
        params.add(categoryCode);
        params.add(categoryCode);
        params.add(categoryCode);

        return jdbcTemplate.query(sql, params.toArray(), (rs, rowNum) -> {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("itemCode", rs.getString("itemCode"));
            m.put("itemName", rs.getString("itemName"));
            return m;
        });
    }

    public List<StockLedgerEntryDTO> getStockLedger(String storeCode, String itemCode, String sizeCode, String asOnDate) {
        LocalDate asOn = parseAsOnDate(asOnDate);
        Date openingDate = Date.valueOf(OPENING_BALANCE_DATE);
        Date asOnSql = Date.valueOf(asOn);
        String sql = """
                WITH movements AS (
                    SELECT
                        ? AS tran_date,
                        'OPENING' AS movement_type,
                        NULL AS ref_no,
                        vc.size_code AS size_code,
                        COALESCE(sz.name, vc.size_code, 'NA') AS size_name,
                        SUM(COALESCE(vc.Opening, 0)) AS qty,
                        0 AS sort_order
                    FROM vw_InventoryClosing vc
                    LEFT JOIN size sz ON sz.code = vc.size_code
                    WHERE
                        (
                            vc.store_code = ?
                            OR (? = 'HO' AND vc.store_code IN ('HO', 'Head Office'))
                        )
                        AND vc.item_code = ?
                        AND vc.tran_date = ?
                        AND (? IS NULL OR ? = '' OR COALESCE(vc.size_code, '') = COALESCE(?, ''))
                    GROUP BY vc.size_code, sz.name

                    UNION ALL

                    SELECT
                        TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 1, 2))) AS tran_date,
                        'PURCHASE' AS movement_type,
                        COALESCE(NULLIF(LTRIM(RTRIM(ph.party_invoice_no)), ''), ph.invoice_no) AS ref_no,
                        pi.size_code AS size_code,
                        COALESCE(sz.name, pi.size_code, 'NA') AS size_name,
                        SUM(COALESCE(pi.quantity, 0)) AS qty,
                        1 AS sort_order
                    FROM pur_item pi
                    INNER JOIN pur_head ph ON ph.invoice_no = pi.invoice_no
                    LEFT JOIN size sz ON sz.code = pi.size_code
                    WHERE
                        ph.status = 'SUBMITTED'
                        AND ph.store_code = ?
                        AND pi.item_code = ?
                        AND (? IS NULL OR ? = '' OR COALESCE(pi.size_code, '') = COALESCE(?, ''))
                        AND TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 1, 2))) BETWEEN ? AND ?
                    GROUP BY
                        TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(ph.invoice_date)), 1, 2))),
                        COALESCE(NULLIF(LTRIM(RTRIM(ph.party_invoice_no)), ''), ph.invoice_no),
                        pi.size_code,
                        sz.name

                    UNION ALL

                    SELECT
                        TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(sh.[date])), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(sh.[date])), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(sh.[date])), 1, 2))) AS tran_date,
                        'INWARD' AS movement_type,
                        sh.sti_number AS ref_no,
                        si.size_code AS size_code,
                        COALESCE(sz.name, si.size_code, 'NA') AS size_name,
                        SUM(COALESCE(si.quantity, 0)) AS qty,
                        2 AS sort_order
                    FROM sti_item si
                    INNER JOIN sti_head sh ON sh.sti_number = si.sti_number
                    LEFT JOIN size sz ON sz.code = si.size_code
                    WHERE
                        sh.received_status = 'RECEIVED'
                        AND sh.to_store = ?
                        AND si.item_code = ?
                        AND (? IS NULL OR ? = '' OR COALESCE(si.size_code, '') = COALESCE(?, ''))
                        AND TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(sh.[date])), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(sh.[date])), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(sh.[date])), 1, 2))) BETWEEN ? AND ?
                    GROUP BY
                        TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(sh.[date])), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(sh.[date])), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(sh.[date])), 1, 2))),
                        sh.sti_number,
                        si.size_code,
                        sz.name

                    UNION ALL

                    SELECT
                        TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(oh.[date])), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(oh.[date])), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(oh.[date])), 1, 2))) AS tran_date,
                        'OUTWARD' AS movement_type,
                        oh.sto_number AS ref_no,
                        oi.size_code AS size_code,
                        COALESCE(sz.name, oi.size_code, 'NA') AS size_name,
                        SUM(COALESCE(oi.quantity, 0)) AS qty,
                        3 AS sort_order
                    FROM sto_item oi
                    INNER JOIN sto_head oh ON oh.sto_number = oi.sto_number
                    LEFT JOIN size sz ON sz.code = oi.size_code
                    WHERE
                        oh.status = 'SUBMITTED'
                        AND oh.from_store = ?
                        AND oi.item_code = ?
                        AND (? IS NULL OR ? = '' OR COALESCE(oi.size_code, '') = COALESCE(?, ''))
                        AND TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(oh.[date])), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(oh.[date])), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(oh.[date])), 1, 2))) BETWEEN ? AND ?
                    GROUP BY
                        TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(oh.[date])), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(oh.[date])), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(oh.[date])), 1, 2))),
                        oh.sto_number,
                        oi.size_code,
                        sz.name

                    UNION ALL

                    SELECT
                        TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 1, 2))) AS tran_date,
                        'SALE' AS movement_type,
                        th.invoice_no AS ref_no,
                        ti.size_code AS size_code,
                        COALESCE(sz.name, ti.size_code, 'NA') AS size_name,
                        SUM(COALESCE(ti.quantity, 0)) AS qty,
                        4 AS sort_order
                    FROM tran_item ti
                    INNER JOIN tran_head th ON th.invoice_no = ti.invoice_no
                    LEFT JOIN size sz ON sz.code = ti.size_code
                    WHERE
                        th.status = 'SUBMITTED'
                        AND th.store_code = ?
                        AND ti.item_code = ?
                        AND (? IS NULL OR ? = '' OR COALESCE(ti.size_code, '') = COALESCE(?, ''))
                        AND TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 1, 2))) BETWEEN ? AND ?
                    GROUP BY
                        TRY_CONVERT(date, CONCAT(SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 7, 4), '-', SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 4, 2), '-', SUBSTRING(LTRIM(RTRIM(th.invoice_date)), 1, 2))),
                        th.invoice_no,
                        ti.size_code,
                        sz.name
                )
                SELECT
                    tran_date,
                    CASE WHEN movement_type = 'OPENING' THEN 'Opening Balance' ELSE ref_no END AS description,
                    size_name,
                    CASE WHEN movement_type = 'OPENING' THEN qty ELSE 0 END AS opening_qty,
                    CASE WHEN movement_type = 'PURCHASE' THEN qty ELSE 0 END AS purchase_qty,
                    CASE WHEN movement_type = 'INWARD' THEN qty ELSE 0 END AS inward_qty,
                    CASE WHEN movement_type = 'OUTWARD' THEN qty ELSE 0 END AS outward_qty,
                    CASE WHEN movement_type = 'SALE' THEN qty ELSE 0 END AS sale_qty,
                    SUM(
                        CASE
                            WHEN movement_type IN ('OPENING', 'PURCHASE', 'INWARD') THEN qty
                            ELSE -qty
                        END
                    ) OVER (
                        PARTITION BY COALESCE(size_code, '')
                        ORDER BY tran_date, sort_order, COALESCE(ref_no, '')
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                    ) AS balance_qty
                FROM movements
                WHERE tran_date IS NOT NULL
                ORDER BY size_name, tran_date, sort_order, COALESCE(ref_no, '')
                """;

        List<Object> params = new ArrayList<>();

        params.add(openingDate);
        params.add(storeCode);
        params.add(storeCode);
        params.add(itemCode);
        params.add(openingDate);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(sizeCode);

        params.add(storeCode);
        params.add(itemCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(openingDate);
        params.add(asOnSql);

        params.add(storeCode);
        params.add(itemCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(openingDate);
        params.add(asOnSql);

        params.add(storeCode);
        params.add(itemCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(openingDate);
        params.add(asOnSql);

        params.add(storeCode);
        params.add(itemCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(sizeCode);
        params.add(openingDate);
        params.add(asOnSql);

        return jdbcTemplate.query(sql, params.toArray(), (rs, rowNum) -> {
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
                    rs.getString("size_name"),
                    rs.getInt("opening_qty"),
                    rs.getInt("purchase_qty"),
                    rs.getInt("inward_qty"),
                    rs.getInt("outward_qty"),
                    rs.getInt("sale_qty"),
                    rs.getInt("balance_qty")
            );
        });
    }

    public byte[] exportStockLedgerToExcel(String storeCode, String itemCode, String sizeCode, String asOnDate) {
        List<StockLedgerEntryDTO> rows = getStockLedger(storeCode, itemCode, sizeCode, asOnDate);

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Stock Ledger");

            int r = 0;
            Row header = sheet.createRow(r++);
            String[] cols = new String[]{
                    "Date",
                    "Description",
                    "Size",
                    "Opening",
                    "Purchase",
                    "Inward",
                    "Outward",
                    "Sale",
                    "Balance"
            };
            for (int c = 0; c < cols.length; c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(cols[c]);
            }

            for (StockLedgerEntryDTO e : rows) {
                Row row = sheet.createRow(r++);
                int c = 0;
                row.createCell(c++).setCellValue(e.getDate() != null ? e.getDate() : "");
                row.createCell(c++).setCellValue(e.getDescription() != null ? e.getDescription() : "");
                row.createCell(c++).setCellValue(e.getReferenceNo() != null ? e.getReferenceNo() : "");
                row.createCell(c++).setCellValue(e.getOpeningQty() != null ? e.getOpeningQty() : 0);
                row.createCell(c++).setCellValue(e.getPurchaseQty() != null ? e.getPurchaseQty() : 0);
                row.createCell(c++).setCellValue(e.getInwardQty() != null ? e.getInwardQty() : 0);
                row.createCell(c++).setCellValue(e.getOutwardQty() != null ? e.getOutwardQty() : 0);
                row.createCell(c++).setCellValue(e.getSaleQty() != null ? e.getSaleQty() : 0);
                row.createCell(c++).setCellValue(e.getBalanceQty() != null ? e.getBalanceQty() : 0);
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

    private String resolveSizeName(String sizeCode) {
        if (sizeCode == null || sizeCode.isBlank()) return "NA";
        try {
            String name = jdbcTemplate.queryForObject(
                    "SELECT TOP 1 name FROM size WHERE code = ?",
                    new Object[]{sizeCode},
                    String.class
            );
            return (name == null || name.isBlank()) ? sizeCode : name;
        } catch (Exception e) {
            return sizeCode;
        }
    }
}
