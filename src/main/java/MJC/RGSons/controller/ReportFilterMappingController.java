package MJC.RGSons.controller;

import MJC.RGSons.model.ReportFilterMapping;
import MJC.RGSons.service.ReportFilterMappingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/report-filter-mappings")
@CrossOrigin(origins = "*")
public class ReportFilterMappingController {

    @Autowired
    private ReportFilterMappingService reportFilterMappingService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getByReportId(@RequestParam("reportId") Integer reportId) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<ReportFilterMapping> list = reportFilterMappingService.getByReportId(reportId);
            response.put("success", true);
            response.put("message", "Filter mappings retrieved successfully");
            response.put("reportFilterMappings", list);
            response.put("count", list.size());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving filter mappings: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody ReportFilterMapping mapping) {
        Map<String, Object> response = new HashMap<>();
        try {
            ReportFilterMapping created = reportFilterMappingService.create(mapping);
            response.put("success", true);
            response.put("message", "Filter mapping created successfully");
            response.put("reportFilterMapping", created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Integer id, @RequestBody ReportFilterMapping details) {
        Map<String, Object> response = new HashMap<>();
        try {
            ReportFilterMapping updated = reportFilterMappingService.update(id, details);
            response.put("success", true);
            response.put("message", "Filter mapping updated successfully");
            response.put("reportFilterMapping", updated);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            reportFilterMappingService.delete(id);
            response.put("success", true);
            response.put("message", "Filter mapping deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
}
