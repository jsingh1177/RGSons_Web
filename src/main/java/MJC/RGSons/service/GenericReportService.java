package MJC.RGSons.service;

import MJC.RGSons.model.ReportColumnMapping;
import MJC.RGSons.model.ReportFilterMapping;
import MJC.RGSons.model.ReportMaster;
import MJC.RGSons.repository.ReportColumnMappingRepository;
import MJC.RGSons.repository.ReportFilterMappingRepository;
import MJC.RGSons.repository.ReportMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GenericReportService {

    private static final Pattern SQL_PARAMETER_PATTERN = Pattern.compile("@([A-Za-z][A-Za-z0-9_]*)");
    private static final Pattern COLON_PARAMETER_PATTERN = Pattern.compile(":(\\w+)");
    private static final Pattern QUOTED_COLON_PARAMETER_PATTERN = Pattern.compile("'\\s*:(\\w+)\\s*'");
    private static final Pattern QUOTED_AT_PARAMETER_PATTERN = Pattern.compile("'\\s*@([A-Za-z][A-Za-z0-9_]*)\\s*'");
    private static final Pattern SAFE_SELECT_PATTERN = Pattern.compile("^\\s*select\\b", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    @Autowired
    private ReportMasterRepository reportMasterRepository;

    @Autowired
    private ReportFilterMappingRepository reportFilterMappingRepository;

    @Autowired
    private ReportColumnMappingRepository reportColumnMappingRepository;

    @Autowired
    private NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    public List<ReportMaster> getActiveReports() {
        return reportMasterRepository.findByActiveTrueOrderByReportNameAsc();
    }

    public Map<String, Object> getReportDefinition(Integer reportId) {
        ReportMaster report = getActiveReport(reportId);
        List<ReportFilterMapping> filters = reportFilterMappingRepository.findByReportIdAndActiveTrueOrderBySortOrderAscIdAsc(reportId);
        List<ReportColumnMapping> columns = reportColumnMappingRepository.findByReportIdAndVisibleTrueOrderBySortOrderAscIdAsc(reportId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("reportMaster", report);
        response.put("filters", filters);
        response.put("columns", columns);
        return response;
    }

    public List<Map<String, Object>> getFilterOptions(Integer reportId, Integer filterId, Map<String, Object> rawFilters) {
        getActiveReport(reportId);
        ReportFilterMapping filter = reportFilterMappingRepository.findById(filterId)
                .orElseThrow(() -> new RuntimeException("Filter mapping not found with id: " + filterId));

        if (!Objects.equals(filter.getReportId(), reportId)) {
            throw new RuntimeException("Filter does not belong to selected report");
        }

        String dropdownQuery = normalizeSelectQuery(filter.getDropdownQuery());
        if (dropdownQuery.isBlank()) {
            return List.of();
        }
        validateSelectQuery(dropdownQuery, "Dropdown query");

        List<ReportFilterMapping> allFilters = reportFilterMappingRepository.findByReportIdAndActiveTrueOrderBySortOrderAscIdAsc(reportId);
        String executableDropdownQuery = convertSqlParameters(dropdownQuery);
        Map<String, String> usedParams = extractNamedParameters(executableDropdownQuery);
        MapSqlParameterSource params = new MapSqlParameterSource();
        for (ReportFilterMapping item : allFilters) {
            String normalizedParam = normalizeParameterName(item.getParameterName());
            String resolvedParam = normalizedParam.isBlank()
                    ? ""
                    : usedParams.getOrDefault(normalizedParam.toLowerCase(Locale.ROOT), "");
            if (resolvedParam == null || resolvedParam.isBlank()) {
                continue;
            }
            Object rawValue = rawFilters != null ? rawFilters.get(item.getFilterName()) : null;
            bindFilterParam(params, item, rawValue, false, resolvedParam);
        }

        List<Map<String, Object>> rows = namedParameterJdbcTemplate.query(
                executableDropdownQuery,
                params,
                new ColumnMapRowMapper()
        );

        List<Map<String, Object>> options = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Object value = getOptionColumnValue(row, "value");
            Object label = getOptionColumnValue(row, "label");

            if (value == null) {
                List<Object> values = new ArrayList<>(row.values());
                value = values.isEmpty() ? null : values.get(0);
                if (label == null) {
                    label = values.size() > 1 ? values.get(1) : value;
                }
            } else if (label == null) {
                label = value;
            }

            String normalizedValue = String.valueOf(value == null ? "" : value).trim();
            if (normalizedValue.isBlank()) {
                continue;
            }

            Map<String, Object> option = new LinkedHashMap<>();
            option.put("value", normalizedValue);
            option.put("label", String.valueOf(label == null ? normalizedValue : label).trim());
            option.put("row", row);
            options.add(option);
        }
        return options;
    }

    public Map<String, Object> executeReport(Integer reportId, Map<String, Object> rawFilters) {
        ExecutedReport executed = executeReportInternal(reportId, rawFilters);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("reportMaster", executed.report());
        response.put("filters", executed.filters());
        response.put("columns", executed.columns());
        response.put("rows", executed.rows());
        response.put("count", executed.rows().size());
        return response;
    }

    public ByteArrayInputStream exportReport(Integer reportId, Map<String, Object> rawFilters) throws IOException {
        ExecutedReport executed = executeReportInternal(reportId, rawFilters);

        try (org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            String sheetName = sanitizeSheetName(executed.report().getReportName());
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet(sheetName);

            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            org.apache.poi.ss.usermodel.CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);

            org.apache.poi.ss.usermodel.DataFormat dataFormat = workbook.createDataFormat();
            org.apache.poi.ss.usermodel.CellStyle integerStyle = workbook.createCellStyle();
            integerStyle.setDataFormat(dataFormat.getFormat("#,##0"));

            org.apache.poi.ss.usermodel.CellStyle decimalStyle = workbook.createCellStyle();
            decimalStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            int columnCount = executed.columns() != null ? executed.columns().size() : 0;
            String reportTitle = String.valueOf(executed.report() != null ? executed.report().getReportName() : "").trim();
            if (reportTitle.isBlank()) {
                reportTitle = "Report";
            }
            org.apache.poi.ss.usermodel.Row titleRow = sheet.createRow(0);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(reportTitle);
            titleCell.setCellStyle(titleStyle);
            if (columnCount > 1) {
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, columnCount - 1));
            }

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(1);
            for (int i = 0; i < executed.columns().size(); i++) {
                Map<String, Object> column = executed.columns().get(i);
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(String.valueOf(column.get("label") == null ? column.get("key") : column.get("label")));
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 2;
            for (Map<String, Object> row : executed.rows()) {
                org.apache.poi.ss.usermodel.Row excelRow = sheet.createRow(rowIndex++);
                for (int colIndex = 0; colIndex < executed.columns().size(); colIndex++) {
                    Map<String, Object> column = executed.columns().get(colIndex);
                    String key = String.valueOf(column.get("key") == null ? "" : column.get("key"));
                    String dataType = String.valueOf(column.get("dataType") == null ? "" : column.get("dataType")).toUpperCase(Locale.ROOT);
                    Object value = getRowValue(row, key);
                    org.apache.poi.ss.usermodel.Cell cell = excelRow.createCell(colIndex);
                    writeExcelCell(cell, value, dataType, integerStyle, decimalStyle);
                }
            }

            for (int i = 0; i < executed.columns().size(); i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private ExecutedReport executeReportInternal(Integer reportId, Map<String, Object> rawFilters) {
        ReportMaster report = getActiveReport(reportId);
        List<ReportFilterMapping> filters = reportFilterMappingRepository.findByReportIdAndActiveTrueOrderBySortOrderAscIdAsc(reportId);
        List<ReportColumnMapping> configuredColumns = reportColumnMappingRepository.findByReportIdAndVisibleTrueOrderBySortOrderAscIdAsc(reportId);

        String originalQuery = normalizeSelectQuery(report.getQuery());
        if (originalQuery.isBlank()) {
            throw new RuntimeException("Report query is empty");
        }
        validateSelectQuery(originalQuery, "Report query");

        String executableQuery = convertSqlParameters(originalQuery);
        Map<String, String> usedParams = extractNamedParameters(executableQuery);
        MapSqlParameterSource params = new MapSqlParameterSource();
        for (ReportFilterMapping filter : filters) {
            String normalizedParam = normalizeParameterName(filter.getParameterName());
            String resolvedParam = normalizedParam.isBlank()
                    ? ""
                    : usedParams.getOrDefault(normalizedParam.toLowerCase(Locale.ROOT), "");
            if (resolvedParam == null || resolvedParam.isBlank()) {
                continue;
            }
            bindFilterParam(params, filter, rawFilters != null ? rawFilters.get(filter.getFilterName()) : null, true, resolvedParam);
        }

        List<Map<String, Object>> rows = namedParameterJdbcTemplate.query(
                executableQuery,
                params,
                new ColumnMapRowMapper()
        );

        List<Map<String, Object>> columns = buildColumns(configuredColumns, rows);
        return new ExecutedReport(report, filters, columns, rows);
    }

    private ReportMaster getActiveReport(Integer reportId) {
        if (reportId == null) {
            throw new RuntimeException("reportId is required");
        }
        return reportMasterRepository.findByIdAndActiveTrue(reportId)
                .orElseThrow(() -> new RuntimeException("Active report not found with id: " + reportId));
    }

    private void bindFilterParam(MapSqlParameterSource params, ReportFilterMapping filter, Object rawValue, boolean enforceRequired, String resolvedParameterName) {
        String filterName = String.valueOf(filter.getFilterName() == null ? "" : filter.getFilterName()).trim();
        String parameterName = String.valueOf(
                resolvedParameterName == null || resolvedParameterName.isBlank()
                        ? normalizeParameterName(filter.getParameterName())
                        : resolvedParameterName
        ).trim();
        String dataType = String.valueOf(filter.getType() == null ? "" : filter.getType()).trim().toUpperCase(Locale.ROOT);

        Object effectiveValue = rawValue;
        if (isBlankValue(effectiveValue)) {
            effectiveValue = filter.getDefaultValue();
        }

        if (enforceRequired && Boolean.TRUE.equals(filter.getRequired()) && isBlankValue(effectiveValue)) {
            throw new RuntimeException("Required filter missing: " + filterName);
        }

        if (parameterName.isBlank()) {
            throw new RuntimeException("Parameter Name is missing for filter: " + filterName);
        }

        if (isBlankValue(effectiveValue)) {
            params.addValue(parameterName, null);
            return;
        }

        if ("NUMBER".equals(dataType)) {
            String text = String.valueOf(effectiveValue).trim();
            try {
                if (text.contains(".")) {
                    params.addValue(parameterName, Double.parseDouble(text), Types.DOUBLE);
                } else {
                    params.addValue(parameterName, Long.parseLong(text), Types.BIGINT);
                }
            } catch (NumberFormatException ex) {
                throw new RuntimeException("Invalid number for filter: " + filterName);
            }
            return;
        }

        if ("MULTISELECT".equals(dataType)) {
            List<String> values = normalizeMultiValue(effectiveValue);
            if (values.isEmpty()) {
                params.addValue(parameterName, null);
            } else {
                params.addValue(parameterName, values);
            }
            return;
        }

        if ("DATE".equals(dataType)) {
            String text = String.valueOf(effectiveValue).trim();
            try {
                params.addValue(parameterName, LocalDate.parse(text), Types.DATE);
            } catch (Exception ex) {
                throw new RuntimeException("Invalid date for filter: " + filterName);
            }
            return;
        }

        if ("DATETIME".equals(dataType)) {
            String text = String.valueOf(effectiveValue).trim();
            try {
                params.addValue(parameterName, LocalDateTime.parse(text), Types.TIMESTAMP);
            } catch (Exception ex) {
                throw new RuntimeException("Invalid datetime for filter: " + filterName);
            }
            return;
        }

        params.addValue(parameterName, String.valueOf(effectiveValue).trim());
    }

    private List<Map<String, Object>> buildColumns(List<ReportColumnMapping> configuredColumns, List<Map<String, Object>> rows) {
        List<Map<String, Object>> columns = new ArrayList<>();
        if (configuredColumns != null && !configuredColumns.isEmpty()) {
            for (ReportColumnMapping column : configuredColumns) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("key", column.getColumnName());
                item.put("label", column.getColumnHeader() == null || column.getColumnHeader().isBlank() ? column.getColumnName() : column.getColumnHeader());
                item.put("dataType", column.getDataType());
                item.put("width", column.getWidth());
                item.put("sortOrder", column.getSortOrder());
                columns.add(item);
            }
            return columns;
        }

        if (rows == null || rows.isEmpty()) {
            return columns;
        }

        Map<String, Object> firstRow = rows.get(0);
        int index = 0;
        for (String key : firstRow.keySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("key", key);
            item.put("label", key);
            item.put("dataType", "TEXT");
            item.put("width", null);
            item.put("sortOrder", index++);
            columns.add(item);
        }
        return columns;
    }

    private String convertSqlParameters(String sql) {
        String normalized = unquoteParameterPlaceholders(sql);
        Matcher matcher = SQL_PARAMETER_PATTERN.matcher(normalized);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            matcher.appendReplacement(buffer, ":" + matcher.group(1));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private Map<String, String> extractNamedParameters(String sql) {
        if (sql == null || sql.isBlank()) {
            return Map.of();
        }
        Map<String, String> names = new LinkedHashMap<>();
        Matcher matcher = COLON_PARAMETER_PATTERN.matcher(sql);
        while (matcher.find()) {
            String name = String.valueOf(matcher.group(1) == null ? "" : matcher.group(1)).trim();
            String normalized = name.toLowerCase(Locale.ROOT);
            if (!name.isBlank() && !names.containsKey(normalized)) {
                names.put(normalized, name);
            }
        }
        return names;
    }

    private String unquoteParameterPlaceholders(String sql) {
        String normalized = sql;
        Matcher colonMatcher = QUOTED_COLON_PARAMETER_PATTERN.matcher(normalized);
        StringBuffer colonBuffer = new StringBuffer();
        while (colonMatcher.find()) {
            colonMatcher.appendReplacement(colonBuffer, ":" + colonMatcher.group(1));
        }
        colonMatcher.appendTail(colonBuffer);

        Matcher atMatcher = QUOTED_AT_PARAMETER_PATTERN.matcher(colonBuffer.toString());
        StringBuffer atBuffer = new StringBuffer();
        while (atMatcher.find()) {
            atMatcher.appendReplacement(atBuffer, "@" + atMatcher.group(1));
        }
        atMatcher.appendTail(atBuffer);
        return atBuffer.toString();
    }

    private void validateSelectQuery(String query, String queryType) {
        String normalized = normalizeSelectQuery(query);
        if (!SAFE_SELECT_PATTERN.matcher(normalized).find()) {
            throw new RuntimeException(queryType + " must start with SELECT");
        }
        String lowered = normalized.toLowerCase(Locale.ROOT);
        if (lowered.contains(";") || lowered.contains(" insert ") || lowered.contains(" update ")
                || lowered.contains(" delete ") || lowered.contains(" drop ")
                || lowered.contains(" alter ") || lowered.contains(" exec ")
                || lowered.contains(" execute ") || lowered.contains(" merge ")) {
            throw new RuntimeException(queryType + " contains unsupported SQL");
        }
    }

    private String normalizeSelectQuery(String sql) {
        String normalized = String.valueOf(sql == null ? "" : sql).trim();
        while (normalized.endsWith(";")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }
        return stripUnmatchedClosingParentheses(normalized);
    }

    private String stripUnmatchedClosingParentheses(String sql) {
        if (sql == null || sql.isBlank()) {
            return "";
        }

        StringBuilder result = new StringBuilder(sql.length());
        int openParens = 0;
        boolean inSingleQuote = false;

        for (int i = 0; i < sql.length(); i++) {
            char ch = sql.charAt(i);

            if (ch == '\'') {
                result.append(ch);
                if (inSingleQuote && i + 1 < sql.length() && sql.charAt(i + 1) == '\'') {
                    result.append(sql.charAt(i + 1));
                    i++;
                } else {
                    inSingleQuote = !inSingleQuote;
                }
                continue;
            }

            if (!inSingleQuote) {
                if (ch == '(') {
                    openParens++;
                    result.append(ch);
                    continue;
                }
                if (ch == ')') {
                    if (openParens == 0) {
                        continue;
                    }
                    openParens--;
                    result.append(ch);
                    continue;
                }
            }

            result.append(ch);
        }

        return result.toString().trim();
    }

    private boolean isBlankValue(Object value) {
        if (value == null) return true;
        if (value instanceof String s) {
            return s.trim().isEmpty();
        }
        if (value instanceof List<?> list) {
            return list.isEmpty();
        }
        return false;
    }

    private List<String> normalizeMultiValue(Object value) {
        if (value instanceof List<?> list) {
            return list.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .toList();
        }
        String text = String.valueOf(value == null ? "" : value).trim();
        if (text.isEmpty()) {
            return List.of();
        }
        String[] parts = text.split(",");
        List<String> values = new ArrayList<>();
        for (String part : parts) {
            String item = String.valueOf(part).trim();
            if (!item.isBlank()) {
                values.add(item);
            }
        }
        return values;
    }

    private String normalizeParameterName(String value) {
        String text = String.valueOf(value == null ? "" : value).trim();
        if (text.startsWith("@")) {
            return text.substring(1).trim();
        }
        return text;
    }

    private Object getRowValue(Map<String, Object> row, String key) {
        if (row == null || key == null || key.isBlank()) return null;
        if (row.containsKey(key)) return row.get(key);
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (key.equalsIgnoreCase(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private Object getOptionColumnValue(Map<String, Object> row, String key) {
        Object direct = getRowValue(row, key);
        if (direct != null) {
            return direct;
        }
        if ("value".equalsIgnoreCase(key)) {
            Object code = getRowValue(row, "code");
            if (code != null) return code;
            Object id = getRowValue(row, "id");
            if (id != null) return id;
        }
        if ("label".equalsIgnoreCase(key)) {
            Object name = getRowValue(row, "name");
            if (name != null) return name;
            Object text = getRowValue(row, "text");
            if (text != null) return text;
        }
        return null;
    }

    private void writeExcelCell(
            org.apache.poi.ss.usermodel.Cell cell,
            Object value,
            String dataType,
            org.apache.poi.ss.usermodel.CellStyle integerStyle,
            org.apache.poi.ss.usermodel.CellStyle decimalStyle
    ) {
        if (value == null) {
            cell.setCellValue("");
            return;
        }

        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
            if (isIntegerType(dataType)) {
                cell.setCellStyle(integerStyle);
            } else {
                cell.setCellStyle(decimalStyle);
            }
            return;
        }

        if (value instanceof java.sql.Date date) {
            cell.setCellValue(date.toLocalDate().toString());
            return;
        }

        if (value instanceof java.sql.Timestamp timestamp) {
            cell.setCellValue(timestamp.toLocalDateTime().toString().replace('T', ' '));
            return;
        }

        if ("BOOLEAN".equals(dataType)) {
            String text = String.valueOf(value);
            boolean boolValue = value instanceof Boolean bool ? bool : "1".equals(text) || "true".equalsIgnoreCase(text);
            cell.setCellValue(boolValue ? "Yes" : "No");
            return;
        }

        cell.setCellValue(String.valueOf(value));
    }

    private boolean isIntegerType(String dataType) {
        return "INT".equals(dataType)
                || "INTEGER".equals(dataType)
                || "LONG".equals(dataType)
                || "BIGINT".equals(dataType)
                || "SMALLINT".equals(dataType);
    }

    private String sanitizeSheetName(String reportName) {
        String fallback = String.valueOf(reportName == null ? "" : reportName).trim();
        if (fallback.isBlank()) {
            fallback = "Generic Report";
        }
        String sanitized = fallback.replaceAll("[\\\\/*?:\\[\\]]", " ").trim();
        if (sanitized.isBlank()) {
            sanitized = "Generic Report";
        }
        return sanitized.length() > 31 ? sanitized.substring(0, 31) : sanitized;
    }

    private record ExecutedReport(
            ReportMaster report,
            List<ReportFilterMapping> filters,
            List<Map<String, Object>> columns,
            List<Map<String, Object>> rows
    ) {
    }
}
