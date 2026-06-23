package MJC.RGSons.controller;

import MJC.RGSons.model.ReportMaster;
import MJC.RGSons.service.GenericReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.InputStreamResource;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/generic-reports")
@CrossOrigin(origins = "*")
public class GenericReportController {

    @Autowired
    private GenericReportService genericReportService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getActiveReports() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<ReportMaster> list = genericReportService.getActiveReports();
            response.put("success", true);
            response.put("message", "Generic reports retrieved successfully");
            response.put("reportMasters", list);
            response.put("count", list.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving generic reports: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{reportId}")
    public ResponseEntity<Map<String, Object>> getDefinition(@PathVariable Integer reportId) {
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> definition = genericReportService.getReportDefinition(reportId);
            response.put("success", true);
            response.put("message", "Generic report definition retrieved successfully");
            response.putAll(definition);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving generic report definition: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/{reportId}/filter-options/{filterId}")
    public ResponseEntity<Map<String, Object>> getFilterOptions(
            @PathVariable Integer reportId,
            @PathVariable Integer filterId,
            @RequestBody(required = false) Map<String, Object> filters
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Map<String, Object>> options = genericReportService.getFilterOptions(reportId, filterId, filters);
            response.put("success", true);
            response.put("message", "Filter options retrieved successfully");
            response.put("options", options);
            response.put("count", options.size());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving filter options: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/{reportId}/execute")
    public ResponseEntity<Map<String, Object>> executeReport(
            @PathVariable Integer reportId,
            @RequestBody(required = false) Map<String, Object> filters
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> result = genericReportService.executeReport(reportId, filters);
            response.put("success", true);
            response.put("message", "Generic report executed successfully");
            response.putAll(result);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error executing generic report: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/{reportId}/export")
    public ResponseEntity<InputStreamResource> exportReport(
            @PathVariable Integer reportId,
            @RequestBody(required = false) Map<String, Object> filters
    ) {
        try {
            Map<String, Object> definition = genericReportService.getReportDefinition(reportId);
            ReportMaster report = (ReportMaster) definition.get("reportMaster");
            String fileName = buildExportFileName(report != null ? report.getReportName() : null);

            InputStreamResource resource = new InputStreamResource(genericReportService.exportReport(reportId, filters));
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName);

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(resource);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String buildExportFileName(String reportName) {
        String base = String.valueOf(reportName == null ? "" : reportName).trim().toLowerCase(Locale.ROOT);
        if (base.isBlank()) {
            base = "generic_report";
        }
        base = base.replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (base.isBlank()) {
            base = "generic_report";
        }
        return base + ".xlsx";
    }
}
