package MJC.RGSons.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

@Service
public class FifoDirtyService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public void markDirty(String storeCode, LocalDate tranDate) {
        String sc = storeCode != null ? storeCode.trim() : "";
        if (sc.isBlank() || tranDate == null) return;

        String sql = """
                MERGE dbo.inv_fifo_dirty AS tgt
                USING (SELECT ? AS store_code, ? AS dirty_from_date) AS src
                ON (tgt.store_code = src.store_code)
                WHEN MATCHED THEN
                    UPDATE SET
                        dirty_from_date = CASE WHEN src.dirty_from_date < tgt.dirty_from_date THEN src.dirty_from_date ELSE tgt.dirty_from_date END,
                        updated_at = SYSUTCDATETIME()
                WHEN NOT MATCHED THEN
                    INSERT (store_code, dirty_from_date, updated_at)
                    VALUES (src.store_code, src.dirty_from_date, SYSUTCDATETIME());
                """;

        jdbcTemplate.update(sql, sc, Date.valueOf(tranDate));
    }

    public List<DirtyStore> getDirtyStoresUpTo(LocalDate toDate) {
        if (toDate == null) return List.of();
        String sql = "SELECT store_code, dirty_from_date FROM dbo.inv_fifo_dirty WHERE dirty_from_date <= ? ORDER BY dirty_from_date, store_code";
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new DirtyStore(rs.getString("store_code"), rs.getDate("dirty_from_date").toLocalDate()),
                Date.valueOf(toDate)
        );
    }

    public LocalDate getDirtyFromDate(String storeCode) {
        String sc = storeCode != null ? storeCode.trim() : "";
        if (sc.isBlank()) return null;
        try {
            Date dirtyFrom = jdbcTemplate.queryForObject(
                    "SELECT dirty_from_date FROM dbo.inv_fifo_dirty WHERE store_code = ?",
                    Date.class,
                    sc
            );
            return dirtyFrom != null ? dirtyFrom.toLocalDate() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    public void clearDirty(String storeCode) {
        String sc = storeCode != null ? storeCode.trim() : "";
        if (sc.isBlank()) return;
        jdbcTemplate.update("DELETE FROM dbo.inv_fifo_dirty WHERE store_code = ?", sc);
    }

    public record DirtyStore(String storeCode, LocalDate dirtyFromDate) {}
}
