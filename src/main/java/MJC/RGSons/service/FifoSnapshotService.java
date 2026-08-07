package MJC.RGSons.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FifoSnapshotService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private FifoDirtyService fifoDirtyService;

    @Transactional
    public Map<String, Object> rebuildDirtySnapshots(LocalDate toDate) {
        LocalDate end = toDate != null ? toDate : LocalDate.now();
        List<FifoDirtyService.DirtyStore> dirty = fifoDirtyService.getDirtyStoresUpTo(end);

        int storesProcessed = 0;
        int snapshotRowsInserted = 0;
        int stoLinesUpdated = 0;

        for (FifoDirtyService.DirtyStore ds : dirty) {
            StoreRunStats s = rebuildStore(ds.storeCode(), ds.dirtyFromDate(), end);
            storesProcessed += 1;
            snapshotRowsInserted += s.snapshotRowsInserted;
            stoLinesUpdated += s.stoLinesUpdated;
            fifoDirtyService.clearDirty(ds.storeCode());
        }

        Map<String, Object> out = new HashMap<>();
        out.put("success", true);
        out.put("toDate", end.toString());
        out.put("dirtyStores", dirty.size());
        out.put("storesProcessed", storesProcessed);
        out.put("snapshotRowsInserted", snapshotRowsInserted);
        out.put("stoLinesUpdated", stoLinesUpdated);
        out.put("message", storesProcessed == 0 ? "No dirty stores found." : "FIFO snapshot updated.");
        return out;
    }

    @Transactional
    public Map<String, Object> rebuildStoreSnapshots(String storeCode, LocalDate toDate) {
        String sc = storeCode != null ? storeCode.trim() : "";
        LocalDate end = toDate != null ? toDate : LocalDate.now();
        if (sc.isBlank()) {
            return Map.of(
                    "success", false,
                    "message", "Store code is required"
            );
        }

        LocalDate dirtyFrom = fifoDirtyService.getDirtyFromDate(sc);
        if (dirtyFrom == null || dirtyFrom.isAfter(end)) {
            return Map.of(
                    "success", true,
                    "storeCode", sc,
                    "toDate", end.toString(),
                    "snapshotRowsInserted", 0,
                    "stoLinesUpdated", 0,
                    "message", "No dirty snapshot changes found."
            );
        }

        StoreRunStats stats = rebuildStore(sc, dirtyFrom, end);
        fifoDirtyService.clearDirty(sc);

        Map<String, Object> out = new HashMap<>();
        out.put("success", true);
        out.put("storeCode", sc);
        out.put("fromDate", dirtyFrom.toString());
        out.put("toDate", end.toString());
        out.put("snapshotRowsInserted", stats.snapshotRowsInserted);
        out.put("stoLinesUpdated", stats.stoLinesUpdated);
        out.put("message", "FIFO snapshot updated.");
        return out;
    }

    private StoreRunStats rebuildStore(String storeCode, LocalDate fromDate, LocalDate toDate) {
        String sc = storeCode != null ? storeCode.trim() : "";
        if (sc.isBlank() || fromDate == null || toDate == null || fromDate.isAfter(toDate)) {
            return new StoreRunStats(0, 0);
        }

        LocalDate calcStart = resolveCalcStartDate(sc, fromDate);
        List<Movement> movements = fetchMovements(sc, calcStart, toDate);

        jdbcTemplate.update(
                "DELETE FROM dbo.inv_fifo_snapshot WHERE store_code = ? AND as_on_date BETWEEN ? AND ?",
                sc,
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        );

        Map<String, StockBalance> balancesByKey = new HashMap<>();
        int idx = 0;
        int snapshotRowsInserted = 0;
        int stoLinesUpdated = 0;

        LocalDate loopStart = fromDate;
        if (!movements.isEmpty()) {
            LocalDate first = movements.get(0).tranDate;
            if (first.isBefore(loopStart)) {
                loopStart = first;
            }
        }

        LocalDate d = loopStart;
        while (!d.isAfter(toDate)) {
            while (idx < movements.size() && movements.get(idx).tranDate.equals(d)) {
                Movement m = movements.get(idx);
                String key = normalizeKey(sc, m.itemCode, m.sizeCode);
                if (m.isIn) {
                    applyIn(balancesByKey, key, m.qty, m.unitCost);
                } else {
                    ConsumeResult cr = applyOut(balancesByKey, key, m.qty, m.unitCost);
                    if (m.stoItemId != null) {
                        double unit = m.qty != 0 ? (cr.totalCost / (double) m.qty) : cr.unitRate;
                        jdbcTemplate.update(
                                "UPDATE dbo.sto_item SET fifo_unit_cost = ?, fifo_amount = ? WHERE id = ?",
                                unit,
                                cr.totalCost,
                                m.stoItemId
                        );
                        stoLinesUpdated += 1;
                    }
                }
                idx += 1;
            }

            if (!d.isBefore(fromDate)) {
                snapshotRowsInserted += writeSnapshot(sc, d, balancesByKey);
            }

            d = d.plusDays(1);
        }

        return new StoreRunStats(snapshotRowsInserted, stoLinesUpdated);
    }

    private LocalDate resolveCalcStartDate(String storeCode, LocalDate fromDate) {
        String sql = """
                SELECT MIN(d) AS minDate
                FROM (
                    SELECT MIN(ob.tran_date) AS d
                    FROM Opening_Balance ob
                    WHERE LTRIM(RTRIM(ob.store_code)) = ?

                    UNION ALL

                    SELECT MIN(pi.tran_date) AS d
                    FROM pur_item pi
                    JOIN pur_head ph ON ph.invoice_no = pi.invoice_no AND ph.store_code = pi.store_code
                    WHERE LTRIM(RTRIM(pi.store_code)) = ?
                      AND ph.status = 'SUBMITTED'

                    UNION ALL

                    SELECT MIN(ti.tran_date) AS d
                    FROM tran_item ti
                    JOIN tran_head th ON th.invoice_no = ti.invoice_no AND th.store_code = ti.store_code AND th.invoice_date = ti.invoice_date
                    WHERE LTRIM(RTRIM(ti.store_code)) = ?
                      AND th.status = 'SUBMITTED'

                    UNION ALL

                    SELECT MIN(so.tran_date) AS d
                    FROM sto_item so
                    JOIN sto_head sh ON sh.sto_number = so.sto_number AND sh.from_store = so.from_store AND sh.date = so.sto_date
                    WHERE sh.status = 'SUBMITTED'
                      AND LTRIM(RTRIM(so.to_store)) = ?

                    UNION ALL

                    SELECT MIN(so.tran_date) AS d
                    FROM sto_item so
                    JOIN sto_head sh ON sh.sto_number = so.sto_number AND sh.from_store = so.from_store AND sh.date = so.sto_date
                    WHERE sh.status = 'SUBMITTED'
                      AND LTRIM(RTRIM(so.from_store)) = ?

                    UNION ALL

                    SELECT MIN(pri.tran_date) AS d
                    FROM pr_item pri
                    JOIN pr_head prh ON prh.invoice_no = pri.invoice_no AND prh.store_code = pri.store_code AND prh.tran_date = pri.tran_date
                    WHERE LTRIM(RTRIM(pri.store_code)) = ?
                      AND prh.status = 'SUBMITTED'
                ) x
                """;

        LocalDate minDate = null;
        try {
            Date d = jdbcTemplate.queryForObject(
                    sql,
                    Date.class,
                    storeCode,
                    storeCode,
                    storeCode,
                    storeCode,
                    storeCode,
                    storeCode
            );
            if (d != null) {
                minDate = d.toLocalDate();
            }
        } catch (Exception ignored) {
        }

        if (minDate == null) return fromDate;
        return minDate.isBefore(fromDate) ? minDate : fromDate;
    }

    private List<Movement> fetchMovements(String storeCode, LocalDate fromDate, LocalDate toDate) {
        String sql = """
                SELECT *
                FROM (
                    SELECT
                        ob.tran_date AS tran_date,
                        10 AS prio,
                        CAST(1 AS BIT) AS is_in,
                        LTRIM(RTRIM(ob.item_code)) AS item_code,
                        LTRIM(RTRIM(COALESCE(ob.size_code, ''))) AS size_code,
                        CAST(COALESCE(ob.Opening, 0) AS INT) AS qty,
                        CAST(COALESCE(ob.Purchase_Price, 0) AS FLOAT) AS unit_cost,
                        CAST(NULL AS INT) AS sto_item_id
                    FROM Opening_Balance ob
                    WHERE LTRIM(RTRIM(ob.store_code)) = ?
                      AND ob.tran_date BETWEEN ? AND ?
                      AND COALESCE(ob.Opening, 0) <> 0

                    UNION ALL

                    SELECT
                        pi.tran_date AS tran_date,
                        20 AS prio,
                        CAST(1 AS BIT) AS is_in,
                        LTRIM(RTRIM(pi.item_code)) AS item_code,
                        LTRIM(RTRIM(COALESCE(pi.size_code, ''))) AS size_code,
                        CAST(COALESCE(pi.quantity, 0) AS INT) AS qty,
                        CAST(COALESCE(pi.price, 0) AS FLOAT) AS unit_cost,
                        CAST(NULL AS INT) AS sto_item_id
                    FROM pur_item pi
                    JOIN pur_head ph ON ph.invoice_no = pi.invoice_no AND ph.store_code = pi.store_code
                    WHERE LTRIM(RTRIM(pi.store_code)) = ?
                      AND pi.tran_date BETWEEN ? AND ?
                      AND ph.status = 'SUBMITTED'
                      AND COALESCE(pi.quantity, 0) <> 0

                    UNION ALL

                    SELECT
                        so.tran_date AS tran_date,
                        30 AS prio,
                        CAST(1 AS BIT) AS is_in,
                        LTRIM(RTRIM(so.item_code)) AS item_code,
                        LTRIM(RTRIM(COALESCE(so.size_code, ''))) AS size_code,
                        CAST(COALESCE(so.quantity, 0) AS INT) AS qty,
                        CAST(COALESCE(NULLIF(so.fifo_unit_cost, 0), so.price, 0) AS FLOAT) AS unit_cost,
                        CAST(NULL AS INT) AS sto_item_id
                    FROM sto_item so
                    JOIN sto_head sh ON sh.sto_number = so.sto_number AND sh.from_store = so.from_store AND sh.date = so.sto_date
                    WHERE LTRIM(RTRIM(so.to_store)) = ?
                      AND so.tran_date BETWEEN ? AND ?
                      AND sh.status = 'SUBMITTED'
                      AND COALESCE(so.quantity, 0) <> 0

                    UNION ALL

                    SELECT
                        so.tran_date AS tran_date,
                        40 AS prio,
                        CAST(0 AS BIT) AS is_in,
                        LTRIM(RTRIM(so.item_code)) AS item_code,
                        LTRIM(RTRIM(COALESCE(so.size_code, ''))) AS size_code,
                        CAST(COALESCE(so.quantity, 0) AS INT) AS qty,
                        CAST(COALESCE(NULLIF(so.fifo_unit_cost, 0), so.price, 0) AS FLOAT) AS unit_cost,
                        CAST(so.id AS INT) AS sto_item_id
                    FROM sto_item so
                    JOIN sto_head sh ON sh.sto_number = so.sto_number AND sh.from_store = so.from_store AND sh.date = so.sto_date
                    WHERE LTRIM(RTRIM(so.from_store)) = ?
                      AND so.tran_date BETWEEN ? AND ?
                      AND sh.status = 'SUBMITTED'
                      AND COALESCE(so.quantity, 0) <> 0

                    UNION ALL

                    SELECT
                        ti.tran_date AS tran_date,
                        50 AS prio,
                        CAST(0 AS BIT) AS is_in,
                        LTRIM(RTRIM(ti.item_code)) AS item_code,
                        LTRIM(RTRIM(COALESCE(ti.size_code, ''))) AS size_code,
                        CAST(COALESCE(ti.quantity, 0) AS INT) AS qty,
                        CAST(NULL AS FLOAT) AS unit_cost,
                        CAST(NULL AS INT) AS sto_item_id
                    FROM tran_item ti
                    JOIN tran_head th ON th.invoice_no = ti.invoice_no AND th.store_code = ti.store_code AND th.invoice_date = ti.invoice_date
                    WHERE LTRIM(RTRIM(ti.store_code)) = ?
                      AND ti.tran_date BETWEEN ? AND ?
                      AND th.status = 'SUBMITTED'
                      AND COALESCE(ti.quantity, 0) <> 0

                    UNION ALL

                    SELECT
                        pri.tran_date AS tran_date,
                        60 AS prio,
                        CAST(0 AS BIT) AS is_in,
                        LTRIM(RTRIM(pri.item_code)) AS item_code,
                        LTRIM(RTRIM(COALESCE(pri.size_code, ''))) AS size_code,
                        CAST(COALESCE(pri.quantity, 0) AS INT) AS qty,
                        CAST(NULL AS FLOAT) AS unit_cost,
                        CAST(NULL AS INT) AS sto_item_id
                    FROM pr_item pri
                    JOIN pr_head prh ON prh.invoice_no = pri.invoice_no AND prh.store_code = pri.store_code AND prh.tran_date = pri.tran_date
                    WHERE LTRIM(RTRIM(pri.store_code)) = ?
                      AND pri.tran_date BETWEEN ? AND ?
                      AND prh.status = 'SUBMITTED'
                      AND COALESCE(pri.quantity, 0) <> 0
                ) x
                ORDER BY tran_date, prio, COALESCE(sto_item_id, 0), item_code, size_code
                """;

        List<Object> params = new ArrayList<>();
        params.add(storeCode);
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));

        params.add(storeCode);
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));

        params.add(storeCode);
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));

        params.add(storeCode);
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));

        params.add(storeCode);
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));

        params.add(storeCode);
        params.add(Date.valueOf(fromDate));
        params.add(Date.valueOf(toDate));

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new Movement(
                        rs.getDate("tran_date").toLocalDate(),
                        rs.getString("item_code"),
                        rs.getString("size_code"),
                        rs.getInt("qty"),
                        rs.getObject("unit_cost") instanceof Number n ? n.doubleValue() : 0.0,
                        rs.getBoolean("is_in"),
                        rs.getObject("sto_item_id") != null ? (Integer) rs.getObject("sto_item_id") : null
                ),
                params.toArray()
        );
    }

    private static String normalizeKey(String storeCode, String itemCode, String sizeCode) {
        String sc = storeCode != null ? storeCode.trim() : "";
        String ic = itemCode != null ? itemCode.trim() : "";
        String sz = sizeCode != null ? sizeCode.trim() : "";
        return sc + "|" + ic + "|" + sz;
    }

    private static void applyIn(Map<String, StockBalance> balancesByKey, String key, int qty, double unitCost) {
        if (qty == 0) return;
        StockBalance balance = balancesByKey.computeIfAbsent(key, k -> new StockBalance());
        double inboundRate = normalizeRate(unitCost);

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
            // When inbound exactly clears an existing position, reset value but keep
            // a usable last rate for any later negative-stock movements.
            balance.value = 0.0;
            balance.lastRate = inboundRate;
        }
    }

    private static ConsumeResult applyOut(Map<String, StockBalance> balancesByKey, String key, int qtyOut, double fallbackUnitCost) {
        if (qtyOut == 0) return new ConsumeResult(0.0, 0.0);
        StockBalance balance = balancesByKey.computeIfAbsent(key, k -> new StockBalance());
        double unitRate = resolveRate(balance, fallbackUnitCost);
        double totalCost = ((double) qtyOut) * unitRate;

        balance.qty -= qtyOut;
        balance.value -= totalCost;
        if (balance.qty == 0) {
            balance.value = 0.0;
        } else if (Math.abs(balance.value) < 0.000001d) {
            balance.value = 0.0;
        }

        // Preserve the balance entry even at zero qty so the last known rate remains
        // available if subsequent movements drive stock negative before the next inbound.
        balance.lastRate = unitRate;

        return new ConsumeResult(totalCost, unitRate);
    }

    private static double resolveRate(StockBalance balance, double fallbackRate) {
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

    private static double normalizeRate(double rate) {
        double normalized = Math.abs(rate);
        return normalized < 0.000001d ? 0.0 : normalized;
    }

    private int writeSnapshot(String storeCode, LocalDate asOn, Map<String, StockBalance> balancesByKey) {
        if (balancesByKey.isEmpty()) return 0;
        List<Object[]> batch = new ArrayList<>();
        String now = java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).toString();

        for (Map.Entry<String, StockBalance> e : balancesByKey.entrySet()) {
            String k = e.getKey();
            String[] parts = k.split("\\|", 3);
            if (parts.length != 3) continue;
            String sc = parts[0];
            String item = parts[1];
            String size = parts[2];
            if (!storeCode.equals(sc)) continue;
            StockBalance balance = e.getValue();
            if (balance == null) continue;
            int qty = balance.qty;
            double val = balance.value;
            if (Math.abs(val) < 0.000001d) {
                val = 0.0;
            }
            if (qty == 0) continue;
            double rate = val / (double) qty;
            batch.add(new Object[]{
                    Date.valueOf(asOn),
                    storeCode,
                    item,
                    size,
                    qty,
                    val,
                    rate,
                    now,
                    now
            });
        }

        if (batch.isEmpty()) return 0;

        jdbcTemplate.batchUpdate(
                "INSERT INTO dbo.inv_fifo_snapshot (as_on_date, store_code, item_code, size_code, closing_qty, closing_value, fifo_rate, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                batch
        );
        return batch.size();
    }

    private record Movement(LocalDate tranDate, String itemCode, String sizeCode, int qty, double unitCost, boolean isIn, Integer stoItemId) {}

    private static class StockBalance {
        int qty;
        double value;
        double lastRate;
    }

    private record ConsumeResult(double totalCost, double unitRate) {}

    private record StoreRunStats(int snapshotRowsInserted, int stoLinesUpdated) {}
}
