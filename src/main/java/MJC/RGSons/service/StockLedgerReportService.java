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

    public List<StockLedgerEntryDTO> getStockLedger(String storeCode, String itemCode, String sizeCode, String fromDate, String asOnDate) {
        LocalDate asOn = parseAsOnDate(asOnDate);
        List<LedgerMovement> movements = fetchLedgerMovements(storeCode, itemCode, sizeCode, OPENING_BALANCE_DATE, asOn);
        List<StockLedgerEntryDTO> rows = new ArrayList<>();
        Map<String, RunningBalance> balanceBySize = new LinkedHashMap<>();

        for (int i = 0; i < movements.size(); i++) {
            LedgerMovement movement = movements.get(i);
            String sizeKey = movement.sizeCode != null ? movement.sizeCode.trim() : "";
            RunningBalance balance = balanceBySize.computeIfAbsent(sizeKey, k -> new RunningBalance());

            int openingQty = 0;
            int purchaseQty = 0;
            int inwardQty = 0;
            int outwardQty = 0;
            int saleQty = 0;

            double openingAmount = 0.0;
            double purchaseAmount = 0.0;
            double inwardAmount = 0.0;
            double outwardAmount = 0.0;
            double saleAmount = 0.0;
            double rateUsed;

            if (movement.isIn) {
                double movementAmount = ((double) movement.qty) * movement.unitRate;
                applyIn(balance, movement.qty, movement.unitRate);
                rateUsed = movement.unitRate;

                switch (movement.movementType) {
                    case "OPENING" -> {
                        openingQty = movement.qty;
                        openingAmount = movementAmount;
                    }
                    case "PURCHASE" -> {
                        purchaseQty = movement.qty;
                        purchaseAmount = movementAmount;
                    }
                    default -> {
                        inwardQty = movement.qty;
                        inwardAmount = movementAmount;
                    }
                }
            } else {
                ConsumeResult consume = applyOut(balance, movement.qty, movement.unitRate);
                double actualAmount = ((double) movement.qty) * movement.unitRate;
                rateUsed = consume.unitRate;

                if (movement.movementType.equals("SALE")) {
                    saleQty = movement.qty;
                    saleAmount = actualAmount;
                } else {
                    outwardQty = movement.qty;
                    outwardAmount = actualAmount;
                }
            }

            rows.add(new StockLedgerEntryDTO(
                    formatDisplayDate(movement.tranDate),
                    movement.description,
                    movement.extraInfo,
                    movement.sizeName,
                    movement.sizeCode,
                    movement.movementType,
                    movement.voucherNo,
                    openingQty,
                    purchaseQty,
                    inwardQty,
                    outwardQty,
                    saleQty,
                    balance.qty,
                    rateUsed,
                    openingAmount,
                    purchaseAmount,
                    inwardAmount,
                    outwardAmount,
                    saleAmount,
                    balance.value
            ));
        }

        return applyFromDateFilter(rows, fromDate, asOn);
    }

    private void applyIn(RunningBalance balance, int qty, double unitRate) {
        if (balance == null || qty == 0) return;
        double inboundRate = normalizeRate(unitRate);

        if (balance.qty < 0) {
            double carryRate = resolveRate(balance, inboundRate);
            int qtyNeededToReachZero = -balance.qty;

            if (qty < qtyNeededToReachZero) {
                balance.qty += qty;
                balance.value = ((double) balance.qty) * carryRate;
                balance.lastRate = carryRate;
                return;
            }

            if (qty == qtyNeededToReachZero) {
                balance.qty = 0;
                balance.value = 0.0;
                balance.lastRate = inboundRate != 0.0 ? inboundRate : carryRate;
                return;
            }

            int surplusQty = qty - qtyNeededToReachZero;
            double surplusRate = inboundRate != 0.0 ? inboundRate : carryRate;
            balance.qty = surplusQty;
            balance.value = ((double) surplusQty) * surplusRate;
            balance.lastRate = surplusRate;
            return;
        }

        balance.qty += qty;
        balance.value += ((double) qty) * inboundRate;
        if (balance.qty != 0) {
            balance.lastRate = resolveRate(balance, inboundRate);
        } else {
            balance.value = 0.0;
            balance.lastRate = inboundRate;
        }
    }

    private ConsumeResult applyOut(RunningBalance balance, int qtyOut, double fallbackUnitRate) {
        if (balance == null || qtyOut == 0) {
            return new ConsumeResult(0.0, 0.0);
        }

        double unitRate = resolveRate(balance, fallbackUnitRate);

        double totalCost = ((double) qtyOut) * unitRate;
        balance.qty -= qtyOut;
        balance.value -= totalCost;
        if (balance.qty == 0) {
            balance.value = 0.0;
        } else if (Math.abs(balance.value) < 0.000001d) {
            balance.value = 0.0;
        }
        balance.lastRate = unitRate;
        return new ConsumeResult(totalCost, unitRate);
    }

    private double resolveRate(RunningBalance balance, double fallbackRate) {
        if (balance != null && balance.qty != 0 && Math.abs(balance.value) >= 0.000001d) {
            double derivedRate = normalizeRate(balance.value / (double) balance.qty);
            if (derivedRate != 0.0) {
                return derivedRate;
            }
        }
        if (balance != null && balance.lastRate != 0.0) {
            return normalizeRate(balance.lastRate);
        }
        return normalizeRate(fallbackRate);
    }

    private double normalizeRate(double rate) {
        double normalized = Math.abs(rate);
        return normalized < 0.000001d ? 0.0 : normalized;
    }

    private List<StockLedgerEntryDTO> applyFromDateFilter(List<StockLedgerEntryDTO> rows, String fromDate, LocalDate asOn) {
        LocalDate requestedFrom = parseInputDate(fromDate, OPENING_BALANCE_DATE);
        if (requestedFrom == null || !requestedFrom.isAfter(OPENING_BALANCE_DATE)) {
            return rows;
        }
        if (requestedFrom.isAfter(asOn)) {
            requestedFrom = asOn;
        }

        Map<String, StockLedgerEntryDTO> lastBeforeBySize = new LinkedHashMap<>();
        List<StockLedgerEntryDTO> filtered = new ArrayList<>();

        for (StockLedgerEntryDTO row : rows) {
            LocalDate rowDate = parseDisplayDate(row != null ? row.getDate() : null);
            if (rowDate == null) {
                filtered.add(row);
                continue;
            }
            String sizeKey = row != null && row.getSizeCode() != null ? row.getSizeCode().trim() : "";
            if (rowDate.isBefore(requestedFrom)) {
                lastBeforeBySize.put(sizeKey, row);
                continue;
            }
            if (!rowDate.isAfter(asOn)) {
                filtered.add(row);
            }
        }

        List<StockLedgerEntryDTO> out = new ArrayList<>();
        for (Map.Entry<String, StockLedgerEntryDTO> entry : lastBeforeBySize.entrySet()) {
            out.add(buildOpeningRow(requestedFrom, entry.getValue()));
        }
        out.addAll(filtered);
        return out;
    }

    private StockLedgerEntryDTO buildOpeningRow(LocalDate openingDate, StockLedgerEntryDTO source) {
        int balanceQty = source != null && source.getBalanceQty() != null ? source.getBalanceQty() : 0;
        double balanceAmt = source != null && source.getBalanceAmount() != null ? source.getBalanceAmount() : 0.0;
        return new StockLedgerEntryDTO(
                formatDisplayDate(openingDate),
                "Opening Balance",
                "",
                source != null ? source.getSizeName() : null,
                source != null ? source.getSizeCode() : null,
                "OPENING",
                null,
                balanceQty,
                0,
                0,
                0,
                0,
                balanceQty,
                balanceQty != 0 ? (balanceAmt / (double) balanceQty) : 0.0,
                balanceAmt,
                0.0,
                0.0,
                0.0,
                0.0,
                balanceAmt
        );
    }

    private List<LedgerMovement> fetchLedgerMovements(String storeCode, String itemCode, String sizeCode, LocalDate fromDate, LocalDate toDate) {
        List<LedgerMovement> movements = new ArrayList<>();
        movements.addAll(fetchOpeningMovements(storeCode, itemCode, sizeCode, fromDate, toDate));
        movements.addAll(fetchPurchaseMovements(storeCode, itemCode, sizeCode, fromDate, toDate));
        movements.addAll(fetchTransferInMovements(storeCode, itemCode, sizeCode, fromDate, toDate));
        movements.addAll(fetchTransferOutMovements(storeCode, itemCode, sizeCode, fromDate, toDate));
        movements.addAll(fetchSalesMovements(storeCode, itemCode, sizeCode, fromDate, toDate));
        movements.addAll(fetchDebitNoteMovements(storeCode, itemCode, sizeCode, fromDate, toDate));
        movements.sort(
                java.util.Comparator.comparing(LedgerMovement::tranDate)
                        .thenComparingInt(LedgerMovement::sortOrder)
                        .thenComparing(m -> m.voucherNo != null ? m.voucherNo : "")
                        .thenComparing(m -> m.description != null ? m.description : "")
        );
        return movements;
    }

    private List<LedgerMovement> fetchOpeningMovements(String storeCode, String itemCode, String sizeCode, LocalDate fromDate, LocalDate toDate) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    ob.tran_date AS tran_date,
                    LTRIM(RTRIM(COALESCE(ob.size_code, ''))) AS size_code,
                    COALESCE(sz.name, ob.size_code, 'NA') AS size_name,
                    CAST(SUM(COALESCE(ob.Opening, 0)) AS INT) AS qty,
                    CAST(CASE WHEN SUM(COALESCE(ob.Opening, 0)) = 0 THEN 0
                        ELSE SUM(CAST(COALESCE(ob.Opening, 0) AS FLOAT) * COALESCE(ob.Purchase_Price, 0))
                             / SUM(COALESCE(ob.Opening, 0)) END AS FLOAT) AS unit_rate
                FROM Opening_Balance ob
                LEFT JOIN size sz ON sz.code = ob.size_code
                WHERE ob.tran_date BETWEEN ? AND ?
                  AND LTRIM(RTRIM(ob.item_code)) = ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));
        params.add(itemCode);
        appendStoreFilter(sql, "ob.store_code", storeCode, params);
        appendSizeFilter(sql, "ob.size_code", sizeCode, params);
        sql.append("""
                GROUP BY ob.tran_date, LTRIM(RTRIM(COALESCE(ob.size_code, ''))), COALESCE(sz.name, ob.size_code, 'NA')
                HAVING SUM(COALESCE(ob.Opening, 0)) <> 0
                """);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new LedgerMovement(
                rs.getDate("tran_date").toLocalDate(),
                0,
                "Opening Balance",
                "OPENING",
                null,
                rs.getString("size_code"),
                rs.getString("size_name"),
                rs.getInt("qty"),
                rs.getDouble("unit_rate"),
                true,
                ""
        ), params.toArray());
    }

    private List<LedgerMovement> fetchPurchaseMovements(String storeCode, String itemCode, String sizeCode, LocalDate fromDate, LocalDate toDate) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    pi.tran_date AS tran_date,
                    ph.invoice_no AS voucher_no,
                    LTRIM(RTRIM(COALESCE(pi.size_code, ''))) AS size_code,
                    COALESCE(sz.name, pi.size_code, 'NA') AS size_name,
                    CAST(SUM(COALESCE(pi.quantity, 0)) AS INT) AS qty,
                    CAST(CASE WHEN SUM(COALESCE(pi.quantity, 0)) = 0 THEN 0
                        ELSE SUM(COALESCE(pi.amount, CAST(COALESCE(pi.quantity, 0) AS FLOAT) * COALESCE(pi.price, 0)))
                             / SUM(COALESCE(pi.quantity, 0)) END AS FLOAT) AS unit_rate
                FROM pur_item pi
                JOIN pur_head ph ON ph.invoice_no = pi.invoice_no AND ph.store_code = pi.store_code
                LEFT JOIN size sz ON sz.code = pi.size_code
                WHERE pi.tran_date BETWEEN ? AND ?
                  AND ph.status = 'SUBMITTED'
                  AND LTRIM(RTRIM(pi.item_code)) = ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));
        params.add(itemCode);
        appendStoreFilter(sql, "pi.store_code", storeCode, params);
        appendSizeFilter(sql, "pi.size_code", sizeCode, params);
        sql.append("""
                GROUP BY pi.tran_date, ph.invoice_no, LTRIM(RTRIM(COALESCE(pi.size_code, ''))), COALESCE(sz.name, pi.size_code, 'NA')
                HAVING SUM(COALESCE(pi.quantity, 0)) <> 0
                """);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new LedgerMovement(
                rs.getDate("tran_date").toLocalDate(),
                1,
                "Purchase",
                "PURCHASE",
                rs.getString("voucher_no"),
                rs.getString("size_code"),
                rs.getString("size_name"),
                rs.getInt("qty"),
                rs.getDouble("unit_rate"),
                true,
                ""
        ), params.toArray());
    }

    private List<LedgerMovement> fetchTransferInMovements(String storeCode, String itemCode, String sizeCode, LocalDate fromDate, LocalDate toDate) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    so.tran_date AS tran_date,
                    so.sto_number AS voucher_no,
                    LTRIM(RTRIM(COALESCE(so.size_code, ''))) AS size_code,
                    COALESCE(sz.name, so.size_code, 'NA') AS size_name,
                    CAST(SUM(COALESCE(so.quantity, 0)) AS INT) AS qty,
                    CAST(CASE WHEN SUM(COALESCE(so.quantity, 0)) = 0 THEN 0
                        ELSE SUM(COALESCE(
                                NULLIF(so.amount, 0),
                                CAST(COALESCE(so.quantity, 0) AS FLOAT) * COALESCE(NULLIF(so.price, 0), 0)
                            ))
                             / SUM(COALESCE(so.quantity, 0)) END AS FLOAT) AS unit_rate
                FROM sto_item so
                JOIN sto_head sh ON sh.sto_number = so.sto_number AND sh.from_store = so.from_store AND sh.date = so.sto_date
                LEFT JOIN size sz ON sz.code = so.size_code
                WHERE so.tran_date BETWEEN ? AND ?
                  AND sh.status = 'SUBMITTED'
                  AND LTRIM(RTRIM(so.item_code)) = ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));
        params.add(itemCode);
        appendStoreFilter(sql, "so.to_store", storeCode, params);
        appendSizeFilter(sql, "so.size_code", sizeCode, params);
        sql.append("""
                GROUP BY so.tran_date, so.sto_number, LTRIM(RTRIM(COALESCE(so.size_code, ''))), COALESCE(sz.name, so.size_code, 'NA')
                HAVING SUM(COALESCE(so.quantity, 0)) <> 0
                """);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new LedgerMovement(
                rs.getDate("tran_date").toLocalDate(),
                2,
                "Stock Journal",
                "INWARD",
                rs.getString("voucher_no"),
                rs.getString("size_code"),
                rs.getString("size_name"),
                rs.getInt("qty"),
                rs.getDouble("unit_rate"),
                true,
                ""
        ), params.toArray());
    }

    private List<LedgerMovement> fetchTransferOutMovements(String storeCode, String itemCode, String sizeCode, LocalDate fromDate, LocalDate toDate) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    so.tran_date AS tran_date,
                    so.sto_number AS voucher_no,
                    LTRIM(RTRIM(COALESCE(so.size_code, ''))) AS size_code,
                    COALESCE(sz.name, so.size_code, 'NA') AS size_name,
                    CAST(SUM(COALESCE(so.quantity, 0)) AS INT) AS qty,
                    CAST(CASE WHEN SUM(COALESCE(so.quantity, 0)) = 0 THEN 0
                        ELSE SUM(COALESCE(
                                NULLIF(so.amount, 0),
                                CAST(COALESCE(so.quantity, 0) AS FLOAT) * COALESCE(NULLIF(so.price, 0), 0)
                            ))
                             / SUM(COALESCE(so.quantity, 0)) END AS FLOAT) AS unit_rate
                FROM sto_item so
                JOIN sto_head sh ON sh.sto_number = so.sto_number AND sh.from_store = so.from_store AND sh.date = so.sto_date
                LEFT JOIN size sz ON sz.code = so.size_code
                WHERE so.tran_date BETWEEN ? AND ?
                  AND sh.status = 'SUBMITTED'
                  AND LTRIM(RTRIM(so.item_code)) = ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));
        params.add(itemCode);
        appendStoreFilter(sql, "so.from_store", storeCode, params);
        appendSizeFilter(sql, "so.size_code", sizeCode, params);
        sql.append("""
                GROUP BY so.tran_date, so.sto_number, LTRIM(RTRIM(COALESCE(so.size_code, ''))), COALESCE(sz.name, so.size_code, 'NA')
                HAVING SUM(COALESCE(so.quantity, 0)) <> 0
                """);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new LedgerMovement(
                rs.getDate("tran_date").toLocalDate(),
                3,
                "Stock Journal",
                "OUTWARD",
                rs.getString("voucher_no"),
                rs.getString("size_code"),
                rs.getString("size_name"),
                rs.getInt("qty"),
                rs.getDouble("unit_rate"),
                false,
                ""
        ), params.toArray());
    }

    private List<LedgerMovement> fetchSalesMovements(String storeCode, String itemCode, String sizeCode, LocalDate fromDate, LocalDate toDate) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    ti.tran_date AS tran_date,
                    ti.invoice_no AS voucher_no,
                    LTRIM(RTRIM(COALESCE(ti.size_code, ''))) AS size_code,
                    COALESCE(sz.name, ti.size_code, 'NA') AS size_name,
                    CAST(SUM(COALESCE(ti.quantity, 0)) AS INT) AS qty,
                    CAST(CASE WHEN SUM(COALESCE(ti.quantity, 0)) = 0 THEN 0
                        ELSE SUM(COALESCE(ti.amount, CAST(COALESCE(ti.quantity, 0) AS FLOAT) * COALESCE(ti.Price, 0)))
                             / SUM(COALESCE(ti.quantity, 0)) END AS FLOAT) AS unit_rate
                FROM tran_item ti
                JOIN tran_head th ON th.invoice_no = ti.invoice_no AND th.store_code = ti.store_code AND th.invoice_date = ti.invoice_date
                LEFT JOIN size sz ON sz.code = ti.size_code
                WHERE ti.tran_date BETWEEN ? AND ?
                  AND th.status = 'SUBMITTED'
                  AND LTRIM(RTRIM(ti.item_code)) = ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));
        params.add(itemCode);
        appendStoreFilter(sql, "ti.store_code", storeCode, params);
        appendSizeFilter(sql, "ti.size_code", sizeCode, params);
        sql.append("""
                GROUP BY ti.tran_date, ti.invoice_no, LTRIM(RTRIM(COALESCE(ti.size_code, ''))), COALESCE(sz.name, ti.size_code, 'NA')
                HAVING SUM(COALESCE(ti.quantity, 0)) <> 0
                """);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new LedgerMovement(
                rs.getDate("tran_date").toLocalDate(),
                4,
                "Sales",
                "SALE",
                rs.getString("voucher_no"),
                rs.getString("size_code"),
                rs.getString("size_name"),
                rs.getInt("qty"),
                rs.getDouble("unit_rate"),
                false,
                ""
        ), params.toArray());
    }

    private List<LedgerMovement> fetchDebitNoteMovements(String storeCode, String itemCode, String sizeCode, LocalDate fromDate, LocalDate toDate) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    pri.tran_date AS tran_date,
                    pri.invoice_no AS voucher_no,
                    LTRIM(RTRIM(COALESCE(pri.size_code, ''))) AS size_code,
                    COALESCE(sz.name, pri.size_code, 'NA') AS size_name,
                    CAST(SUM(COALESCE(pri.quantity, 0)) AS INT) AS qty,
                    CAST(CASE WHEN SUM(COALESCE(pri.quantity, 0)) = 0 THEN 0
                        ELSE SUM(COALESCE(pri.amount, CAST(COALESCE(pri.quantity, 0) AS FLOAT) * COALESCE(pri.price, 0)))
                             / SUM(COALESCE(pri.quantity, 0)) END AS FLOAT) AS unit_rate
                FROM pr_item pri
                JOIN pr_head prh ON prh.invoice_no = pri.invoice_no AND prh.store_code = pri.store_code AND prh.tran_date = pri.tran_date
                LEFT JOIN size sz ON sz.code = pri.size_code
                WHERE pri.tran_date BETWEEN ? AND ?
                  AND prh.status = 'SUBMITTED'
                  AND LTRIM(RTRIM(pri.item_code)) = ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));
        params.add(itemCode);
        appendStoreFilter(sql, "pri.store_code", storeCode, params);
        appendSizeFilter(sql, "pri.size_code", sizeCode, params);
        sql.append("""
                GROUP BY pri.tran_date, pri.invoice_no, LTRIM(RTRIM(COALESCE(pri.size_code, ''))), COALESCE(sz.name, pri.size_code, 'NA')
                HAVING SUM(COALESCE(pri.quantity, 0)) <> 0
                """);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new LedgerMovement(
                rs.getDate("tran_date").toLocalDate(),
                5,
                "Debit Note",
                "OUTWARD",
                rs.getString("voucher_no"),
                rs.getString("size_code"),
                rs.getString("size_name"),
                rs.getInt("qty"),
                rs.getDouble("unit_rate"),
                false,
                ""
        ), params.toArray());
    }

    private record ConsumeResult(double totalCost, double unitRate) {}

    private void appendStoreFilter(StringBuilder sql, String fieldExpression, String storeCode, List<Object> params) {
        String sc = storeCode != null ? storeCode.trim() : "";
        if (sc.isBlank()) return;
        if ("HO".equalsIgnoreCase(sc)) {
            sql.append(" AND LTRIM(RTRIM(").append(fieldExpression).append(")) IN ('HO', 'Head Office') ");
            return;
        }
        sql.append(" AND LTRIM(RTRIM(").append(fieldExpression).append(")) = ? ");
        params.add(sc);
    }

    private void appendSizeFilter(StringBuilder sql, String fieldExpression, String sizeCode, List<Object> params) {
        String sz = sizeCode != null ? sizeCode.trim() : "";
        if (sz.isBlank()) return;
        sql.append(" AND LTRIM(RTRIM(COALESCE(").append(fieldExpression).append(", ''))) = ? ");
        params.add(sz);
    }

    private String formatDisplayDate(LocalDate date) {
        if (date == null) return "";
        if (OPENING_BALANCE_DATE.equals(date)) {
            return "01-Apr-2026";
        }
        return DISPLAY_DATE.format(date);
    }

    private record LedgerMovement(
            LocalDate tranDate,
            int sortOrder,
            String description,
            String movementType,
            String voucherNo,
            String sizeCode,
            String sizeName,
            int qty,
            double unitRate,
            boolean isIn,
            String extraInfo
    ) {}

    private static class RunningBalance {
        int qty;
        double value;
        double lastRate;
    }

    public byte[] exportStockLedgerToExcel(String storeCode, String itemCode, String sizeCode, String fromDate, String asOnDate) {
        List<StockLedgerEntryDTO> rows = getStockLedger(storeCode, itemCode, sizeCode, fromDate, asOnDate);

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
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 8));

            int headerTopRowIdx = r;
            Row headerTop = sheet.createRow(r++);
            headerTop.setHeightInPoints(20);
            Row headerSub = sheet.createRow(r++);
            headerSub.setHeightInPoints(18);

            headerTop.createCell(0).setCellValue("Date");
            headerTop.createCell(1).setCellValue("Vch Type");
            headerTop.createCell(2).setCellValue("Vch No.");
            headerTop.createCell(3).setCellValue("Inwards");
            headerTop.createCell(5).setCellValue("Outwards");
            headerTop.createCell(7).setCellValue("Closing");

            headerSub.createCell(3).setCellValue("Quantity");
            headerSub.createCell(4).setCellValue("Value");
            headerSub.createCell(5).setCellValue("Quantity");
            headerSub.createCell(6).setCellValue("Value");
            headerSub.createCell(7).setCellValue("Quantity");
            headerSub.createCell(8).setCellValue("Value");

            for (int c = 0; c <= 8; c++) {
                Cell topCell = headerTop.getCell(c);
                if (topCell == null) topCell = headerTop.createCell(c);
                topCell.setCellStyle(headerStyle);
                Cell subCell = headerSub.getCell(c);
                if (subCell == null) subCell = headerSub.createCell(c);
                subCell.setCellStyle(headerStyle);
            }

            sheet.addMergedRegion(new CellRangeAddress(headerTopRowIdx, headerTopRowIdx + 1, 0, 0));
            sheet.addMergedRegion(new CellRangeAddress(headerTopRowIdx, headerTopRowIdx + 1, 1, 1));
            sheet.addMergedRegion(new CellRangeAddress(headerTopRowIdx, headerTopRowIdx + 1, 2, 2));
            sheet.addMergedRegion(new CellRangeAddress(headerTopRowIdx, headerTopRowIdx, 3, 4));
            sheet.addMergedRegion(new CellRangeAddress(headerTopRowIdx, headerTopRowIdx, 5, 6));
            sheet.addMergedRegion(new CellRangeAddress(headerTopRowIdx, headerTopRowIdx, 7, 8));

            int totalInQty = 0;
            double totalInAmt = 0.0;
            int totalOutQty = 0;
            double totalOutAmt = 0.0;
            int lastCloseQty = 0;
            double lastCloseAmt = 0.0;

            for (StockLedgerEntryDTO e : rows) {
                Row row = sheet.createRow(r++);
                int c = 0;

                Cell dateCell = row.createCell(c++);
                dateCell.setCellValue(e.getDate() != null ? e.getDate() : "");
                dateCell.setCellStyle(borderStyle);

                Cell vchTypeCell = row.createCell(c++);
                vchTypeCell.setCellValue(e.getDescription() != null ? e.getDescription() : "");
                vchTypeCell.setCellStyle(borderStyle);

                Cell vchNoCell = row.createCell(c++);
                vchNoCell.setCellValue(e.getVoucherNo() != null ? e.getVoucherNo() : "");
                vchNoCell.setCellStyle(borderStyle);

                int inQty = (e.getOpeningQty() != null ? e.getOpeningQty() : 0)
                        + (e.getPurchaseQty() != null ? e.getPurchaseQty() : 0)
                        + (e.getInwardQty() != null ? e.getInwardQty() : 0);
                double inAmt = (e.getOpeningAmount() != null ? e.getOpeningAmount() : 0.0)
                        + (e.getPurchaseAmount() != null ? e.getPurchaseAmount() : 0.0)
                        + (e.getInwardAmount() != null ? e.getInwardAmount() : 0.0);
                int outQty = (e.getOutwardQty() != null ? e.getOutwardQty() : 0)
                        + (e.getSaleQty() != null ? e.getSaleQty() : 0);
                double outAmt = (e.getOutwardAmount() != null ? e.getOutwardAmount() : 0.0)
                        + (e.getSaleAmount() != null ? e.getSaleAmount() : 0.0);
                int closeQty = e.getBalanceQty() != null ? e.getBalanceQty() : 0;
                double closeAmt = e.getBalanceAmount() != null ? e.getBalanceAmount() : 0.0;

                totalInQty += inQty;
                totalInAmt += inAmt;
                totalOutQty += outQty;
                totalOutAmt += outAmt;
                lastCloseQty = closeQty;
                lastCloseAmt = closeAmt;

                Cell inQtyCell = row.createCell(c++);
                inQtyCell.setCellValue(inQty);
                inQtyCell.setCellStyle(numberStyle);

                Cell inAmtCell = row.createCell(c++);
                inAmtCell.setCellValue(inAmt);
                inAmtCell.setCellStyle(amountStyle);

                Cell outQtyCell = row.createCell(c++);
                outQtyCell.setCellValue(outQty);
                outQtyCell.setCellStyle(numberStyle);

                Cell outAmtCell = row.createCell(c++);
                outAmtCell.setCellValue(outAmt);
                outAmtCell.setCellStyle(amountStyle);

                Cell closeQtyCell = row.createCell(c++);
                closeQtyCell.setCellValue(closeQty);
                closeQtyCell.setCellStyle(numberStyle);

                Cell closeAmtCell = row.createCell(c++);
                closeAmtCell.setCellValue(closeAmt);
                closeAmtCell.setCellStyle(amountStyle);
            }

            Row totalRow = sheet.createRow(r++);
            Cell totalLabel = totalRow.createCell(0);
            totalLabel.setCellValue("Totals");
            totalLabel.setCellStyle(borderStyle);
            sheet.addMergedRegion(new CellRangeAddress(totalRow.getRowNum(), totalRow.getRowNum(), 0, 2));

            for (int c = 1; c <= 2; c++) {
                Cell pad = totalRow.createCell(c);
                pad.setCellStyle(borderStyle);
            }

            Cell totalInQtyCell = totalRow.createCell(3);
            totalInQtyCell.setCellValue(totalInQty);
            totalInQtyCell.setCellStyle(numberStyle);

            Cell totalInAmtCell = totalRow.createCell(4);
            totalInAmtCell.setCellValue(totalInAmt);
            totalInAmtCell.setCellStyle(amountStyle);

            Cell totalOutQtyCell = totalRow.createCell(5);
            totalOutQtyCell.setCellValue(totalOutQty);
            totalOutQtyCell.setCellStyle(numberStyle);

            Cell totalOutAmtCell = totalRow.createCell(6);
            totalOutAmtCell.setCellValue(totalOutAmt);
            totalOutAmtCell.setCellStyle(amountStyle);

            Cell totalCloseQtyCell = totalRow.createCell(7);
            totalCloseQtyCell.setCellValue(lastCloseQty);
            totalCloseQtyCell.setCellStyle(numberStyle);

            Cell totalCloseAmtCell = totalRow.createCell(8);
            totalCloseAmtCell.setCellValue(lastCloseAmt);
            totalCloseAmtCell.setCellStyle(amountStyle);

            for (int c = 0; c <= 8; c++) {
                sheet.autoSizeColumn(c);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export Stock Ledger", e);
        }
    }

    private LocalDate parseInputDate(String input, LocalDate fallback) {
        if (input == null || input.isBlank()) return fallback;
        try {
            return LocalDate.parse(input.trim(), ISO_DATE);
        } catch (Exception e) {
            return fallback;
        }
    }

    private LocalDate parseAsOnDate(String asOnDate) {
        return parseInputDate(asOnDate, LocalDate.now());
    }

    private LocalDate parseDisplayDate(String displayDate) {
        if (displayDate == null || displayDate.isBlank()) return null;
        try {
            return LocalDate.parse(displayDate.trim(), DISPLAY_DATE);
        } catch (Exception ignored) {
        }
        try {
            return LocalDate.parse(displayDate.trim(), ISO_DATE);
        } catch (Exception ignored) {
        }
        return null;
    }
}
