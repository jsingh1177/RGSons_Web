package MJC.RGSons.service;

import MJC.RGSons.model.Item;
import MJC.RGSons.model.Size;
import MJC.RGSons.repository.ItemRepository;
import MJC.RGSons.repository.SizeRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OpeningBalanceService {
    private static final DateTimeFormatter EXCEL_DATE = DateTimeFormatter.ofPattern("dd-MMM-yy", Locale.ENGLISH);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SizeRepository sizeRepository;

    public List<Size> getOpeningSizes() {
        List<Size> sizes = sizeRepository.findByStatusOrderByNameAsc(true);
        List<Size> ordered = new ArrayList<>();
        addFirstMatch(ordered, sizes, List.of("750", "650"));
        addFirstMatch(ordered, sizes, List.of("375", "500"));
        addFirstMatch(ordered, sizes, List.of("180", "200"));
        addFirstMatch(ordered, sizes, List.of("90", "60"));
        addFirstMatch(ordered, sizes, List.of("330", "275"));

        if (ordered.isEmpty()) {
            return sizes;
        }

        for (Size s : sizes) {
            if (s == null || s.getCode() == null) continue;
            if (ordered.stream().noneMatch(x -> x.getCode().equals(s.getCode()))) {
                ordered.add(s);
            }
        }
        return ordered;
    }

    private void addFirstMatch(List<Size> out, List<Size> sizes, List<String> mustContain) {
        for (Size s : sizes) {
            String name = s.getName() != null ? s.getName().toLowerCase() : "";
            boolean ok = true;
            for (String token : mustContain) {
                if (!name.contains(token)) {
                    ok = false;
                    break;
                }
            }
            if (ok && out.stream().noneMatch(x -> x.getCode().equals(s.getCode()))) {
                out.add(s);
                return;
            }
        }
    }

    public List<Item> getActiveItemsByCategory(String categoryCode) {
        if (categoryCode == null || categoryCode.isBlank()) {
            return itemRepository.findByStatus(true);
        }
        return itemRepository.findByCategoryCodeAndStatus(categoryCode, true);
    }

    public Map<String, Object> getMatrix(String storeCode, String categoryCode, LocalDate tranDate) {
        List<Size> sizes = getOpeningSizes();
        List<Item> items = getActiveItemsByCategory(categoryCode);

        List<String> sizeCodes = sizes.stream().map(Size::getCode).toList();
        java.util.Set<String> itemSet = new java.util.HashSet<>();
        java.util.Set<String> sizeSet = new java.util.HashSet<>();
        for (Item it : items) {
            String k = normalizeKey(it != null ? it.getItemCode() : null);
            if (k != null && !k.isBlank()) itemSet.add(k);
        }
        for (Size sz : sizes) {
            String k = normalizeKey(sz != null ? sz.getCode() : null);
            if (k != null && !k.isBlank()) sizeSet.add(k);
        }

        List<String> storeCodes = new ArrayList<>();
        if (storeCode != null) {
            storeCodes.add(storeCode);
            if ("HO".equalsIgnoreCase(storeCode)) {
                storeCodes.add("Head Office");
            }
        }

        Map<String, Map<String, Integer>> openingByItemSize = new HashMap<>();
        Map<String, Long> createdAtByItemSize = new HashMap<>();
        if (!storeCodes.isEmpty() && !sizeCodes.isEmpty()) {
            TableAndColumns tc = resolveOpeningBalanceTableAndColumns();
            String itemCol = q(tc.itemCodeCol);
            String sizeCol = q(tc.sizeCodeCol);
            String openingCol = tc.openingCol != null ? q(tc.openingCol) : "0";
            String storeCol = q(tc.storeCodeCol);

            String createdAtSelect = "";
            if (tc.createdAtCol != null) {
                createdAtSelect = ", " + q(tc.createdAtCol) + " AS createdAt";
            }

            String sql = "SELECT " + itemCol + " AS itemCode, " + sizeCol + " AS sizeCode, " + openingCol + " AS opening " + createdAtSelect + " " +
                    "FROM " + tc.fullTableName + " WHERE " + storeCol + " IN (" +
                    placeholders(storeCodes.size()) + ") AND " + sizeCol + " IN (" + placeholders(sizeCodes.size()) + ")";
            List<Object> params = new ArrayList<>();
            params.addAll(storeCodes);
            params.addAll(sizeCodes);
            if (tc.tranDateCol != null && tranDate != null) {
                sql += " AND " + q(tc.tranDateCol) + " = ?";
                params.add(Date.valueOf(tranDate));
            }

            List<Map<String, Object>> balances = jdbcTemplate.queryForList(sql, params.toArray());
            for (Map<String, Object> r : balances) {
                String itemKey = normalizeKey(r.get("itemCode") != null ? r.get("itemCode").toString() : null);
                String sizeKey = normalizeKey(r.get("sizeCode") != null ? r.get("sizeCode").toString() : null);
                if (itemKey == null || sizeKey == null) continue;
                if (!itemSet.isEmpty() && !itemSet.contains(itemKey)) continue;
                if (!sizeSet.isEmpty() && !sizeSet.contains(sizeKey)) continue;
                Integer opening = r.get("opening") instanceof Number n ? n.intValue() : 0;
                openingByItemSize.computeIfAbsent(itemKey, k -> new HashMap<>()).put(sizeKey, opening != null ? opening : 0);

                Object createdAtObj = r.get("createdAt");
                long createdAtMs = 0L;
                if (createdAtObj instanceof java.sql.Timestamp ts) {
                    createdAtMs = ts.getTime();
                } else if (createdAtObj instanceof java.util.Date ud) {
                    createdAtMs = ud.getTime();
                }
                if (createdAtMs > 0L) {
                    String key = itemKey + "|" + sizeKey;
                    Long existing = createdAtByItemSize.get(key);
                    if (existing == null || createdAtMs < existing) {
                        createdAtByItemSize.put(key, createdAtMs);
                    }
                }
            }
        }

        Map<String, Double> purchasePrices = new HashMap<>();
        if (!sizeCodes.isEmpty()) {
            String pSql = "SELECT Item_Code AS itemCode, Size_Code AS sizeCode, Purchase_Price AS purchasePrice " +
                    "FROM Price_Master WHERE Size_Code IN (" + placeholders(sizeCodes.size()) + ")";
            List<Map<String, Object>> pRows = jdbcTemplate.queryForList(pSql, sizeCodes.toArray());
            for (Map<String, Object> r : pRows) {
                String itemKey = normalizeKey(r.get("itemCode") != null ? r.get("itemCode").toString() : null);
                String sizeKey = normalizeKey(r.get("sizeCode") != null ? r.get("sizeCode").toString() : null);
                if (itemKey == null || sizeKey == null) continue;
                if (!itemSet.isEmpty() && !itemSet.contains(itemKey)) continue;
                if (!sizeSet.isEmpty() && !sizeSet.contains(sizeKey)) continue;
                Double purchasePrice = r.get("purchasePrice") instanceof Number n ? n.doubleValue() : null;
                purchasePrices.put(itemKey + "|" + sizeKey, purchasePrice != null ? purchasePrice : 0.0);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Item item : items) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("itemCode", cleanCode(item.getItemCode()));
            row.put("itemName", item.getItemName());
            String itemKey = normalizeKey(item.getItemCode());
            Map<String, Integer> openings = new LinkedHashMap<>();
            for (Size s : sizes) {
                String sizeCode = cleanCode(s.getCode());
                String sizeKey = normalizeKey(s.getCode());
                Integer v = openingByItemSize.getOrDefault(itemKey, Map.of()).get(sizeKey);
                openings.put(sizeCode, v != null ? v : 0);
            }
            row.put("openings", openings);
            rows.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sizes", sizes.stream().map(s -> Map.of("code", cleanCode(s.getCode()), "name", s.getName())).collect(Collectors.toList()));
        result.put("rows", rows);
        result.put("purchasePrices", purchasePrices);
        result.put("cellCreatedAt", createdAtByItemSize);
        return result;
    }

    private String cleanCode(String s) {
        if (s == null) return null;
        return s.replace('\u00A0', ' ').trim();
    }

    private String normalizeKey(String s) {
        if (s == null) return null;
        String v = s.replace('\u00A0', ' ').replaceAll("[\\t\\n\\r]", " ").trim();
        v = v.replaceAll("[\\s]+", "");
        return v.isEmpty() ? null : v;
    }

    public Map<String, Object> saveMatrix(String storeCode, LocalDate tranDate, List<Map<String, Object>> rows) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (rows == null) {
            result.put("inserted", 0);
            result.put("updated", 0);
            result.put("deleted", 0);
            result.put("cells", 0);
            return result;
        }

        TableAndColumns tc = resolveOpeningBalanceTableAndColumns();

        List<Size> sizes = getOpeningSizes();
        List<String> sizeCodes = sizes.stream().map(Size::getCode).toList();

        Map<String, Double> incomingPurchasePrices = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String itemCode = valueAsString(row.get("itemCode"));
            if (itemCode == null || itemCode.isBlank()) continue;
            Object pricesObj = row.get("prices");
            if (!(pricesObj instanceof Map<?, ?> pricesMap)) continue;
            for (Map.Entry<?, ?> e : pricesMap.entrySet()) {
                String sizeCode = e.getKey() != null ? e.getKey().toString() : null;
                if (sizeCode == null || sizeCode.isBlank()) continue;
                Double price = valueAsDouble(e.getValue());
                if (price == null) continue;
                incomingPurchasePrices.put(itemCode + "|" + sizeCode, price);
            }
        }

        if (!incomingPurchasePrices.isEmpty()) {
            java.util.Set<String> touchedItemCodes = new java.util.HashSet<>();
            for (String k : incomingPurchasePrices.keySet()) {
                String[] parts = k.split("\\|", 2);
                if (parts.length > 0 && !parts[0].isBlank()) touchedItemCodes.add(parts[0]);
            }

            Map<String, String> itemNameByCode = new HashMap<>();
            if (!touchedItemCodes.isEmpty()) {
                String sql = "SELECT item_code AS itemCode, item_name AS itemName FROM items WHERE item_code IN (" + placeholders(touchedItemCodes.size()) + ")";
                List<Map<String, Object>> itemRows = jdbcTemplate.queryForList(sql, touchedItemCodes.toArray());
                for (Map<String, Object> r : itemRows) {
                    String c = r.get("itemCode") != null ? r.get("itemCode").toString() : null;
                    if (c == null) continue;
                    itemNameByCode.put(c, r.get("itemName") != null ? r.get("itemName").toString() : "");
                }
            }

            Map<String, String> sizeNameByCode = new HashMap<>();
            for (Size s : sizes) {
                if (s == null || s.getCode() == null) continue;
                sizeNameByCode.put(s.getCode(), s.getName() != null ? s.getName() : s.getCode());
            }

            for (Map.Entry<String, Double> e : incomingPurchasePrices.entrySet()) {
                String key = e.getKey();
                Double price = e.getValue();
                String[] parts = key.split("\\|", 2);
                String itemCode = parts.length > 0 ? parts[0] : "";
                String sizeCode = parts.length > 1 ? parts[1] : "";
                if (itemCode.isBlank() || sizeCode.isBlank()) continue;

                int updated = jdbcTemplate.update(
                        "UPDATE Price_Master SET Purchase_Price = ? WHERE Item_Code = ? AND Size_Code = ?",
                        price,
                        itemCode,
                        sizeCode
                );
                if (updated > 0) continue;

                try {
                    jdbcTemplate.update(
                            "INSERT INTO Price_Master (Item_Code, Item_Name, Size_Code, Size_Name, Purchase_Price) VALUES (?, ?, ?, ?, ?)",
                            itemCode,
                            itemNameByCode.getOrDefault(itemCode, ""),
                            sizeCode,
                            sizeNameByCode.getOrDefault(sizeCode, sizeCode),
                            price
                    );
                } catch (Exception ex) {
                    jdbcTemplate.update(
                            "UPDATE Price_Master SET Purchase_Price = ? WHERE Item_Code = ? AND Size_Code = ?",
                            price,
                            itemCode,
                            sizeCode
                    );
                }
            }
        }

        Map<String, Map<String, Double>> priceMap = new HashMap<>();
        if (!sizeCodes.isEmpty()) {
            String pSql = "SELECT Item_Code AS itemCode, Size_Code AS sizeCode, Purchase_Price AS purchasePrice, Sale_Price AS salePrice, MRP AS mrp " +
                    "FROM Price_Master WHERE Size_Code IN (" +
                    placeholders(sizeCodes.size()) + ")";
            List<Map<String, Object>> pRows = jdbcTemplate.queryForList(pSql, sizeCodes.toArray());
            for (Map<String, Object> r : pRows) {
                String itemCode = r.get("itemCode") != null ? r.get("itemCode").toString() : null;
                String sizeCode = r.get("sizeCode") != null ? r.get("sizeCode").toString() : null;
                if (itemCode == null || sizeCode == null) continue;
                Map<String, Double> prices = new HashMap<>();
                prices.put("Purchase_Price", r.get("purchasePrice") instanceof Number n ? n.doubleValue() : null);
                prices.put("Sale_Price", r.get("salePrice") instanceof Number n ? n.doubleValue() : null);
                prices.put("MRP", r.get("mrp") instanceof Number n ? n.doubleValue() : null);
                priceMap.put(itemCode + "|" + sizeCode, prices);
            }
        }

        int inserted = 0;
        int updatedTotal = 0;
        int deleted = 0;
        int cells = 0;

        for (Map<String, Object> row : rows) {
            String itemCode = valueAsString(row.get("itemCode"));
            if (itemCode == null || itemCode.isBlank()) continue;
            Object openingsObj = row.get("openings");
            if (!(openingsObj instanceof Map<?, ?> openingsMap)) continue;

            for (Map.Entry<?, ?> e : openingsMap.entrySet()) {
                String sizeCode = e.getKey() != null ? e.getKey().toString() : null;
                if (sizeCode == null || sizeCode.isBlank()) continue;
                Integer opening = valueAsInt(e.getValue());
                cells++;

                int openingValue = opening != null ? opening : 0;
                if (openingValue == 0) {
                    int del = jdbcTemplate.update(
                            "DELETE FROM " + tc.fullTableName + " WHERE " +
                                    q(tc.storeCodeCol) + " = ? AND " +
                                    q(tc.itemCodeCol) + " = ? AND " +
                                    q(tc.sizeCodeCol) + " = ?",
                            storeCode,
                            itemCode,
                            sizeCode
                    );
                    deleted += del;
                    continue;
                }

                Map<String, Double> prices = priceMap.getOrDefault(itemCode + "|" + sizeCode, Map.of());
                Double purchasePrice = prices.get("Purchase_Price");
                Double salePrice = prices.get("Sale_Price");
                Double mrp = prices.get("MRP");

                StringBuilder updateSql = new StringBuilder();
                List<Object> updateParams = new ArrayList<>();

                updateSql.append("UPDATE ").append(tc.fullTableName).append(" SET ");
                boolean first = true;

                if (tc.tranDateCol != null) {
                    updateSql.append(q(tc.tranDateCol)).append(" = ?");
                    updateParams.add(Date.valueOf(tranDate));
                    first = false;
                }
                if (tc.openingCol != null) {
                    if (!first) updateSql.append(", ");
                    updateSql.append(q(tc.openingCol)).append(" = ?");
                    updateParams.add(openingValue);
                    first = false;
                }
                if (tc.purchasePriceCol != null) {
                    if (!first) updateSql.append(", ");
                    updateSql.append(q(tc.purchasePriceCol)).append(" = ?");
                    updateParams.add(purchasePrice);
                    first = false;
                }
                if (tc.salePriceCol != null) {
                    if (!first) updateSql.append(", ");
                    updateSql.append(q(tc.salePriceCol)).append(" = ?");
                    updateParams.add(salePrice);
                    first = false;
                }
                if (tc.mrpCol != null) {
                    if (!first) updateSql.append(", ");
                    updateSql.append(q(tc.mrpCol)).append(" = ?");
                    updateParams.add(mrp);
                    first = false;
                }
                if (tc.updatedAtCol != null) {
                    if (!first) updateSql.append(", ");
                    updateSql.append(q(tc.updatedAtCol)).append(" = GETDATE()");
                }

                updateSql.append(" WHERE ")
                        .append(q(tc.storeCodeCol)).append(" = ? AND ")
                        .append(q(tc.itemCodeCol)).append(" = ? AND ")
                        .append(q(tc.sizeCodeCol)).append(" = ?");
                updateParams.add(storeCode);
                updateParams.add(itemCode);
                updateParams.add(sizeCode);

                int updated = jdbcTemplate.update(updateSql.toString(), updateParams.toArray());
                if (updated > 0) updatedTotal += updated;

                if (updated == 0) {
                    StringBuilder insertCols = new StringBuilder();
                    StringBuilder insertVals = new StringBuilder();
                    List<Object> insertParams = new ArrayList<>();

                    addInsert(insertCols, insertVals, insertParams, tc.storeCodeCol, storeCode);
                    addInsert(insertCols, insertVals, insertParams, tc.itemCodeCol, itemCode);
                    addInsert(insertCols, insertVals, insertParams, tc.sizeCodeCol, sizeCode);
                    if (tc.tranDateCol != null) addInsert(insertCols, insertVals, insertParams, tc.tranDateCol, Date.valueOf(tranDate));
                    if (tc.openingCol != null) addInsert(insertCols, insertVals, insertParams, tc.openingCol, openingValue);
                    if (tc.purchasePriceCol != null) addInsert(insertCols, insertVals, insertParams, tc.purchasePriceCol, purchasePrice);
                    if (tc.salePriceCol != null) addInsert(insertCols, insertVals, insertParams, tc.salePriceCol, salePrice);
                    if (tc.mrpCol != null) addInsert(insertCols, insertVals, insertParams, tc.mrpCol, mrp);
                    if (tc.createdAtCol != null) addInsertExpression(insertCols, insertVals, tc.createdAtCol, "GETDATE()");
                    if (tc.updatedAtCol != null) addInsertExpression(insertCols, insertVals, tc.updatedAtCol, "GETDATE()");

                    try {
                        jdbcTemplate.update(
                                "INSERT INTO " + tc.fullTableName + " (" + insertCols + ") VALUES (" + insertVals + ")",
                                insertParams.toArray()
                        );
                        inserted++;
                    } catch (Exception ex) {
                        int retryUpdated = jdbcTemplate.update(updateSql.toString(), updateParams.toArray());
                        if (retryUpdated > 0) updatedTotal += retryUpdated;
                    }
                }
            }
        }

        result.put("inserted", inserted);
        result.put("updated", updatedTotal);
        result.put("deleted", deleted);
        result.put("cells", cells);
        result.put("table", tc.fullTableName);
        return result;
    }

    public int deleteMatrix(String storeCode, String categoryCode, LocalDate tranDate) {
        if (storeCode == null || storeCode.isBlank()) {
            throw new IllegalArgumentException("storeCode is required");
        }
        if (tranDate == null) {
            throw new IllegalArgumentException("tranDate is required");
        }

        TableAndColumns tc = resolveOpeningBalanceTableAndColumns();
        List<String> storeCodes = new ArrayList<>();
        storeCodes.add(storeCode);
        if ("HO".equalsIgnoreCase(storeCode)) {
            storeCodes.add("Head Office");
        }

        String storeCol = q(tc.storeCodeCol);
        String itemCol = q(tc.itemCodeCol);
        String tranDateCol = tc.tranDateCol != null ? q(tc.tranDateCol) : null;

        String sql = "DELETE ob FROM " + tc.fullTableName + " ob ";
        List<Object> params = new ArrayList<>();

        if (categoryCode != null && !categoryCode.isBlank()) {
            sql += "INNER JOIN items it ON LTRIM(RTRIM(it.item_code)) = LTRIM(RTRIM(ob." + itemCol + ")) ";
        }

        sql += "WHERE ob." + storeCol + " IN (" + placeholders(storeCodes.size()) + ") ";
        params.addAll(storeCodes);

        if (tranDateCol != null) {
            sql += "AND ob." + tranDateCol + " = ? ";
            params.add(Date.valueOf(tranDate));
        }

        if (categoryCode != null && !categoryCode.isBlank()) {
            sql += "AND it.category_code = ? ";
            params.add(categoryCode);
        }

        return jdbcTemplate.update(sql, params.toArray());
    }

    public ByteArrayInputStream exportFlatToExcel(String storeCode, String categoryCode, LocalDate tranDate) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Opening Balance");

            int r = 0;
            Row header = sheet.createRow(r++);
            header.createCell(0).setCellValue("Store Name");
            header.createCell(1).setCellValue("Date");
            header.createCell(2).setCellValue("Item Name");
            header.createCell(3).setCellValue("Size Name");
            header.createCell(4).setCellValue("Opening Qty");
            header.createCell(5).setCellValue("Price");

            TableAndColumns tc = resolveOpeningBalanceTableAndColumns();
            List<String> storeCodes = new ArrayList<>();
            storeCodes.add(storeCode);
            if ("HO".equalsIgnoreCase(storeCode)) {
                storeCodes.add("Head Office");
            }

            String storeCol = q(tc.storeCodeCol);
            String itemCol = q(tc.itemCodeCol);
            String sizeCol = q(tc.sizeCodeCol);
            String openingCol = tc.openingCol != null ? q(tc.openingCol) : "0";
            String tranDateCol = tc.tranDateCol != null ? q(tc.tranDateCol) : null;

            String dateSelect = "NULL AS tranDate";
            if (tranDate == null && tranDateCol != null) {
                dateSelect = "ob." + tranDateCol + " AS tranDate";
            }

            String obItemNorm = "REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CONVERT(varchar(100), ob." + itemCol + "))), CHAR(160), ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), '')";
            String obSizeNorm = "REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CONVERT(varchar(100), ob." + sizeCol + "))), CHAR(160), ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), '')";
            String itCodeNorm = "REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CONVERT(varchar(100), it.item_code))), CHAR(160), ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), '')";
            String szCodeNorm = "REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CONVERT(varchar(100), sz.code))), CHAR(160), ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), '')";
            String pmItemNorm = "REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CONVERT(varchar(100), pm.Item_Code))), CHAR(160), ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), '')";
            String pmSizeNorm = "REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CONVERT(varchar(100), pm.Size_Code))), CHAR(160), ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), '')";

            String sql = "SELECT " +
                    "COALESCE(st.store_name, ob." + storeCol + ") AS storeName, " +
                    dateSelect + ", " +
                    "COALESCE(NULLIF(LTRIM(RTRIM(it.item_name)), ''), " + obItemNorm + ") AS itemName, " +
                    "COALESCE(NULLIF(LTRIM(RTRIM(sz.name)), ''), " + obSizeNorm + ") AS sizeName, " +
                    "ob." + openingCol + " AS openingQty, " +
                    "COALESCE(pm.Purchase_Price, 0) AS purchasePrice " +
                    "FROM " + tc.fullTableName + " ob " +
                    "LEFT JOIN store st ON st.store_code = ob." + storeCol + " " +
                    "LEFT JOIN items it ON " + itCodeNorm + " = " + obItemNorm + " " +
                    "LEFT JOIN size sz ON " + szCodeNorm + " = " + obSizeNorm + " " +
                    "LEFT JOIN Price_Master pm ON " + pmItemNorm + " = " + obItemNorm + " AND " + pmSizeNorm + " = " + obSizeNorm + " " +
                    "WHERE ob." + storeCol + " IN (" + placeholders(storeCodes.size()) + ") ";

            List<Object> params = new ArrayList<>();
            params.addAll(storeCodes);

            if (tranDateCol != null && tranDate != null) {
                sql += "AND ob." + tranDateCol + " = ? ";
                params.add(Date.valueOf(tranDate));
            }
            if (categoryCode != null && !categoryCode.isBlank()) {
                sql += "AND it.category_code = ? ";
                params.add(categoryCode);
            }
            sql += "AND COALESCE(ob." + openingCol + ", 0) <> 0 ";
            sql += "ORDER BY COALESCE(NULLIF(LTRIM(RTRIM(it.item_name)), ''), " + obItemNorm + "), COALESCE(NULLIF(LTRIM(RTRIM(sz.name)), ''), " + obSizeNorm + ")";

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
            String forcedDateStr = tranDate != null ? EXCEL_DATE.format(tranDate) : null;
            for (Map<String, Object> row : rows) {
                Row rr = sheet.createRow(r++);
                rr.createCell(0).setCellValue(row.get("storeName") != null ? row.get("storeName").toString() : "");
                String dateStr = forcedDateStr;
                if (dateStr == null) {
                    Object d = row.get("tranDate");
                    if (d instanceof java.sql.Date sd) {
                        dateStr = EXCEL_DATE.format(sd.toLocalDate());
                    } else if (d instanceof java.util.Date ud) {
                        dateStr = EXCEL_DATE.format(new java.sql.Date(ud.getTime()).toLocalDate());
                    } else if (d != null) {
                        dateStr = d.toString();
                    } else {
                        dateStr = "";
                    }
                }
                rr.createCell(1).setCellValue(dateStr);
                rr.createCell(2).setCellValue(row.get("itemName") != null ? row.get("itemName").toString() : "");
                rr.createCell(3).setCellValue(row.get("sizeName") != null ? row.get("sizeName").toString() : "");
                Object q = row.get("openingQty");
                double qty = q instanceof Number n ? n.doubleValue() : 0;
                rr.createCell(4).setCellValue(qty);
                Object p = row.get("purchasePrice");
                double price = p instanceof Number n ? n.doubleValue() : 0;
                rr.createCell(5).setCellValue(price);
            }

            for (int i = 0; i < 6; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Failed to export Opening Balance", e);
        }
    }

    public Map<String, Object> importMatrixFromExcel(MultipartFile file, String storeCode, String categoryCode, LocalDate tranDate) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<String> errors = new ArrayList<>();
        int savedCount = 0;

        List<Size> sizes = getOpeningSizes();
        List<Map<String, Object>> sizeMeta = sizes.stream().map(s -> Map.<String, Object>of("code", s.getCode(), "name", s.getName())).toList();

        Map<String, String> headerNameToSizeCode = new HashMap<>();
        for (Map<String, Object> s : sizeMeta) {
            headerNameToSizeCode.put(String.valueOf(s.get("name")).trim().toLowerCase(), String.valueOf(s.get("code")));
        }

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row header = sheet.getRow(0);
            if (header == null) {
                result.put("savedCount", 0);
                result.put("errors", List.of("Missing header row"));
                return result;
            }

            String firstHeader = header.getCell(0) != null ? header.getCell(0).toString().trim() : "";
            boolean isFlat = "Store Name".equalsIgnoreCase(firstHeader);

            if (isFlat) {
                Map<String, String> storeNameToCode = new HashMap<>();
                List<Map<String, Object>> storeRows = jdbcTemplate.queryForList("SELECT store_code AS storeCode, store_name AS storeName FROM store");
                for (Map<String, Object> r : storeRows) {
                    String code = r.get("storeCode") != null ? r.get("storeCode").toString().trim() : "";
                    String name = r.get("storeName") != null ? r.get("storeName").toString().trim() : "";
                    if (!code.isEmpty()) {
                        storeNameToCode.putIfAbsent(code.toLowerCase(), code);
                    }
                    if (!name.isEmpty() && !code.isEmpty()) {
                        storeNameToCode.putIfAbsent(name.toLowerCase(), code);
                    }
                }
                storeNameToCode.putIfAbsent("head office", "HO");
                storeNameToCode.putIfAbsent("ho", "HO");

                Map<String, String> itemNameToCode = new HashMap<>();
                List<Map<String, Object>> itemRows = jdbcTemplate.queryForList("SELECT item_code AS itemCode, item_name AS itemName FROM items");
                for (Map<String, Object> r : itemRows) {
                    String name = r.get("itemName") != null ? r.get("itemName").toString().trim() : "";
                    String code = r.get("itemCode") != null ? r.get("itemCode").toString().trim() : "";
                    if (!name.isEmpty() && !code.isEmpty()) {
                        itemNameToCode.putIfAbsent(name.toLowerCase(), code);
                    }
                }

                Map<String, String> sizeNameToCode = new HashMap<>();
                List<Map<String, Object>> sizeRows = jdbcTemplate.queryForList("SELECT code AS sizeCode, name AS sizeName FROM size");
                for (Map<String, Object> r : sizeRows) {
                    String name = r.get("sizeName") != null ? r.get("sizeName").toString().trim() : "";
                    String code = r.get("sizeCode") != null ? r.get("sizeCode").toString().trim() : "";
                    if (!name.isEmpty() && !code.isEmpty()) {
                        sizeNameToCode.putIfAbsent(name.toLowerCase(), code);
                    }
                }

                int priceIdx = -1;
                for (int c = 0; c < header.getLastCellNum(); c++) {
                    Cell cell = header.getCell(c);
                    String hn = cell != null ? cell.toString().trim().toLowerCase() : "";
                    if (hn.equals("price") || hn.contains("purchase") && hn.contains("price")) {
                        priceIdx = c;
                        break;
                    }
                }

                int lastRow = sheet.getLastRowNum();
                Map<String, Map<String, Map<String, Integer>>> grouped = new HashMap<>();
                Map<String, Map<String, Map<String, Double>>> groupedPrices = new HashMap<>();
                for (int i = 1; i <= lastRow; i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;
                    String storeName = row.getCell(0) != null ? row.getCell(0).toString().trim() : "";
                    String itemName = row.getCell(2) != null ? row.getCell(2).toString().trim() : "";
                    String sizeName = row.getCell(3) != null ? row.getCell(3).toString().trim() : "";
                    String qtyStr = row.getCell(4) != null ? row.getCell(4).toString().trim() : "";
                    String priceStr = (priceIdx >= 0 && row.getCell(priceIdx) != null) ? row.getCell(priceIdx).toString().trim() : "";

                    if (itemName.isEmpty() || sizeName.isEmpty()) continue;

                    String resolvedStoreCode = null;
                    if (!storeName.isEmpty()) {
                        resolvedStoreCode = storeNameToCode.get(storeName.toLowerCase());
                        if (resolvedStoreCode == null) {
                            resolvedStoreCode = storeNameToCode.get(storeName.replace('\u00A0', ' ').trim().toLowerCase());
                        }
                    }
                    if ((resolvedStoreCode == null || resolvedStoreCode.isBlank()) && storeCode != null && !storeCode.isBlank()) {
                        resolvedStoreCode = storeCode.trim();
                    }
                    if (resolvedStoreCode == null || resolvedStoreCode.isBlank()) {
                        errors.add("Row " + (i + 1) + " unknown store: " + (storeName.isEmpty() ? "(blank)" : storeName));
                        continue;
                    }

                    LocalDate rowDate = tranDate;
                    if (rowDate == null) {
                        rowDate = parseExcelDateCell(row.getCell(1));
                    }
                    if (rowDate == null) {
                        errors.add("Row " + (i + 1) + " invalid date for store " + resolvedStoreCode);
                        continue;
                    }
                    String groupKey = resolvedStoreCode + "|" + rowDate;

                    String itemCode = itemNameToCode.get(itemName.toLowerCase());
                    if (itemCode == null) {
                        errors.add("Row " + (i + 1) + " unknown item: " + itemName);
                        continue;
                    }
                    String sizeCode = sizeNameToCode.get(sizeName.toLowerCase());
                    if (sizeCode == null) {
                        errors.add("Row " + (i + 1) + " unknown size: " + sizeName);
                        continue;
                    }

                    Integer qty = 0;
                    if (!qtyStr.isEmpty()) {
                        try {
                            qty = (int) Math.round(Double.parseDouble(qtyStr));
                        } catch (Exception ex) {
                            errors.add("Row " + (i + 1) + " invalid qty for " + itemName + " / " + sizeName);
                            continue;
                        }
                    }

                    grouped.computeIfAbsent(groupKey, k -> new LinkedHashMap<>())
                            .computeIfAbsent(itemCode, k -> new LinkedHashMap<>())
                            .put(sizeCode, qty != null ? qty : 0);

                    if (!priceStr.isEmpty()) {
                        try {
                            Double p = Double.parseDouble(priceStr);
                            groupedPrices.computeIfAbsent(groupKey, k -> new LinkedHashMap<>())
                                    .computeIfAbsent(itemCode, k -> new LinkedHashMap<>())
                                    .put(sizeCode, p);
                        } catch (Exception ex) {
                            errors.add("Row " + (i + 1) + " invalid price for " + itemName + " / " + sizeName);
                        }
                    }
                }

                int groupSaved = 0;
                for (Map.Entry<String, Map<String, Map<String, Integer>>> groupEntry : grouped.entrySet()) {
                    String groupKey = groupEntry.getKey();
                    String[] parts = groupKey.split("\\|", 2);
                    String gStore = parts.length > 0 ? parts[0] : "";
                    LocalDate gDate = parts.length > 1 ? LocalDate.parse(parts[1]) : null;
                    if (gStore.isBlank() || gDate == null) continue;

                    List<Map<String, Object>> rows = new ArrayList<>();
                    for (Map.Entry<String, Map<String, Integer>> e : groupEntry.getValue().entrySet()) {
                        Map<String, Object> rMap = new LinkedHashMap<>();
                        rMap.put("itemCode", e.getKey());
                        rMap.put("openings", e.getValue());
                        Map<String, Map<String, Double>> groupPrice = groupedPrices.get(groupKey);
                        Map<String, Double> prices = groupPrice != null ? groupPrice.get(e.getKey()) : null;
                        if (prices != null && !prices.isEmpty()) {
                            rMap.put("prices", prices);
                        }
                        rows.add(rMap);
                    }

                    if (!rows.isEmpty()) {
                        saveMatrix(gStore, gDate, rows);
                        groupSaved += rows.size();
                    }
                }

                savedCount = groupSaved;

                result.put("savedCount", savedCount);
                result.put("errors", errors);
                return result;
            }

            Map<Integer, String> colToSizeCode = new HashMap<>();
            for (int col = 2; col < header.getLastCellNum(); col++) {
                Cell cell = header.getCell(col);
                String headerName = cell != null ? cell.toString().trim().toLowerCase() : "";
                String sizeCode = headerNameToSizeCode.get(headerName);
                if (sizeCode != null) {
                    colToSizeCode.put(col, sizeCode);
                }
            }

            int lastRow = sheet.getLastRowNum();
            List<Map<String, Object>> rows = new ArrayList<>();

            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String itemCode = row.getCell(0) != null ? row.getCell(0).toString().trim() : "";
                if (itemCode.isEmpty()) continue;

                Map<String, Object> rMap = new LinkedHashMap<>();
                rMap.put("itemCode", itemCode);
                Map<String, Integer> openings = new LinkedHashMap<>();

                for (Map.Entry<Integer, String> e : colToSizeCode.entrySet()) {
                    Integer col = e.getKey();
                    String sizeCode = e.getValue();
                    Integer qty = null;
                    Cell cell = row.getCell(col);
                    if (cell != null) {
                        String s = cell.toString().trim();
                        if (!s.isEmpty()) {
                            try {
                                double d = Double.parseDouble(s);
                                qty = (int) Math.round(d);
                            } catch (Exception ex) {
                                errors.add("Row " + (i + 1) + " invalid qty for " + itemCode + " size " + sizeCode);
                            }
                        }
                    }
                    openings.put(sizeCode, qty != null ? qty : 0);
                }

                rMap.put("openings", openings);
                rows.add(rMap);
            }

            if (storeCode == null || storeCode.isBlank()) {
                errors.add("Store is required for this excel format");
                result.put("savedCount", 0);
                result.put("errors", errors);
                return result;
            }
            if (tranDate == null) {
                tranDate = LocalDate.now();
            }
            saveMatrix(storeCode, tranDate, rows);
            savedCount = rows.size();
        } catch (Exception e) {
            errors.add("Failed to import: " + e.getMessage());
        }

        result.put("savedCount", savedCount);
        result.put("errors", errors);
        return result;
    }

    private LocalDate parseExcelDateCell(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                java.util.Date d = cell.getDateCellValue();
                if (d == null) return null;
                return new java.sql.Date(d.getTime()).toLocalDate();
            }
        } catch (Exception ignored) {
        }
        String s = cell.toString() != null ? cell.toString().trim() : "";
        if (s.isEmpty()) return null;
        return parseDateString(s);
    }

    private LocalDate parseDateString(String s) {
        if (s == null) return null;
        String v = s.trim();
        if (v.isEmpty()) return null;
        List<DateTimeFormatter> fmts = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("dd-MMM-yy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH)
        );
        for (DateTimeFormatter f : fmts) {
            try {
                return LocalDate.parse(v, f);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private String valueAsString(Object o) {
        if (o == null) return "";
        return String.valueOf(o);
    }

    private Integer valueAsInt(Object o) {
        if (o == null) return null;
        if (o instanceof Integer i) return i;
        if (o instanceof Long l) return l.intValue();
        if (o instanceof Double d) return d.intValue();
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        try {
            return (int) Math.round(Double.parseDouble(s));
        } catch (Exception e) {
            return null;
        }
    }

    private Double valueAsDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Double d) return d;
        if (o instanceof Float f) return (double) f;
        if (o instanceof Integer i) return (double) i;
        if (o instanceof Long l) return (double) l;
        if (o instanceof Number n) return n.doubleValue();
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        try {
            return Double.parseDouble(s);
        } catch (Exception e) {
            return null;
        }
    }

    private String placeholders(int count) {
        if (count <= 0) return "";
        return String.join(",", java.util.Collections.nCopies(count, "?"));
    }

    private void addInsert(StringBuilder cols, StringBuilder vals, List<Object> params, String colName, Object value) {
        if (cols.length() > 0) {
            cols.append(", ");
            vals.append(", ");
        }
        cols.append(q(colName));
        vals.append("?");
        params.add(value);
    }

    private void addInsertExpression(StringBuilder cols, StringBuilder vals, String colName, String expression) {
        if (cols.length() > 0) {
            cols.append(", ");
            vals.append(", ");
        }
        cols.append(q(colName));
        vals.append(expression);
    }

    private String q(String colName) {
        return "[" + colName + "]";
    }

    private TableAndColumns resolveOpeningBalanceTableAndColumns() {
        String foundSchema = null;
        String foundTable = null;
        List<String> candidates = List.of("Opening_Balance", "opening_balance");
        for (String t : candidates) {
            List<Map<String, Object>> tables = jdbcTemplate.queryForList(
                    "SELECT TABLE_SCHEMA AS tableSchema, TABLE_NAME AS tableName FROM INFORMATION_SCHEMA.TABLES WHERE LOWER(TABLE_NAME) = LOWER(?)",
                    t
            );
            if (tables.isEmpty()) continue;
            Map<String, Object> dbo = tables.stream().filter(r -> "dbo".equalsIgnoreCase(String.valueOf(r.get("tableSchema")))).findFirst().orElse(null);
            Map<String, Object> chosen = dbo != null ? dbo : tables.get(0);
            foundSchema = String.valueOf(chosen.get("tableSchema"));
            foundTable = String.valueOf(chosen.get("tableName"));
            break;
        }
        if (foundSchema == null) foundSchema = "dbo";
        if (foundTable == null) foundTable = "Opening_Balance";

        List<String> cols = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE LOWER(TABLE_NAME) = LOWER(?) AND LOWER(TABLE_SCHEMA) = LOWER(?)",
                String.class,
                foundTable,
                foundSchema
        );

        Map<String, String> normalizedToActual = new HashMap<>();
        for (String c : cols) {
            if (c == null) continue;
            normalizedToActual.put(normalizeCol(c), c);
        }

        String storeCodeCol = findCol(normalizedToActual, "storecode", "store_code");
        String itemCodeCol = findCol(normalizedToActual, "itemcode", "item_code");
        String sizeCodeCol = findCol(normalizedToActual, "sizecode", "size_code");
        String tranDateCol = findCol(normalizedToActual, "trandate", "tran_date");
        String openingCol = findCol(normalizedToActual, "opening");
        String purchasePriceCol = findCol(normalizedToActual, "purchaseprice", "purchase_price", "purchase_price");
        String salePriceCol = findCol(normalizedToActual, "saleprice", "sale_price");
        String mrpCol = findCol(normalizedToActual, "mrp");
        String createdAtCol = findCol(normalizedToActual, "createdat", "created_at");
        String updatedAtCol = findCol(normalizedToActual, "updatedat", "updated_at");

        if (storeCodeCol == null) storeCodeCol = "Store_code";
        if (itemCodeCol == null) itemCodeCol = "Item_code";
        if (sizeCodeCol == null) sizeCodeCol = "Size_code";

        String fullTableName = "[" + foundSchema + "].[" + foundTable + "]";

        return new TableAndColumns(
                fullTableName,
                storeCodeCol,
                itemCodeCol,
                sizeCodeCol,
                tranDateCol,
                openingCol,
                purchasePriceCol,
                salePriceCol,
                mrpCol,
                createdAtCol,
                updatedAtCol
        );
    }

    private String findCol(Map<String, String> normalizedToActual, String... candidates) {
        for (String c : candidates) {
            if (c == null) continue;
            String key = normalizeCol(c);
            String actual = normalizedToActual.get(key);
            if (actual != null) return actual;
        }
        return null;
    }

    private String normalizeCol(String s) {
        if (s == null) return "";
        return s.trim().toLowerCase().replace("_", "").replace(" ", "");
    }

    private static class TableAndColumns {
        private final String fullTableName;
        private final String storeCodeCol;
        private final String itemCodeCol;
        private final String sizeCodeCol;
        private final String tranDateCol;
        private final String openingCol;
        private final String purchasePriceCol;
        private final String salePriceCol;
        private final String mrpCol;
        private final String createdAtCol;
        private final String updatedAtCol;

        private TableAndColumns(
                String fullTableName,
                String storeCodeCol,
                String itemCodeCol,
                String sizeCodeCol,
                String tranDateCol,
                String openingCol,
                String purchasePriceCol,
                String salePriceCol,
                String mrpCol,
                String createdAtCol,
                String updatedAtCol
        ) {
            this.fullTableName = fullTableName;
            this.storeCodeCol = storeCodeCol;
            this.itemCodeCol = itemCodeCol;
            this.sizeCodeCol = sizeCodeCol;
            this.tranDateCol = tranDateCol;
            this.openingCol = openingCol;
            this.purchasePriceCol = purchasePriceCol;
            this.salePriceCol = salePriceCol;
            this.mrpCol = mrpCol;
            this.createdAtCol = createdAtCol;
            this.updatedAtCol = updatedAtCol;
        }
    }
}
