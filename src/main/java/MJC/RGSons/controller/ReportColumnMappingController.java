package MJC.RGSons.controller;

import MJC.RGSons.model.ReportColumnMapping;
import MJC.RGSons.service.ReportColumnMappingService;
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
@RequestMapping("/api/report-column-mappings")
@CrossOrigin(origins = "*")
public class ReportColumnMappingController {

    @Autowired
    private ReportColumnMappingService reportColumnMappingService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getByReportId(@RequestParam("reportId") Integer reportId) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<ReportColumnMapping> list = reportColumnMappingService.getByReportId(reportId);
            response.put("success", true);
            response.put("message", "Column mappings retrieved successfully");
            response.put("reportColumnMappings", list);
            response.put("count", list.size());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving column mappings: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody ReportColumnMapping mapping) {
        Map<String, Object> response = new HashMap<>();
        try {
            ReportColumnMapping created = reportColumnMappingService.create(mapping);
            response.put("success", true);
            response.put("message", "Column mapping created successfully");
            response.put("reportColumnMapping", created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Integer id, @RequestBody ReportColumnMapping details) {
        Map<String, Object> response = new HashMap<>();
        try {
            ReportColumnMapping updated = reportColumnMappingService.update(id, details);
            response.put("success", true);
            response.put("message", "Column mapping updated successfully");
            response.put("reportColumnMapping", updated);
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
            reportColumnMappingService.delete(id);
            response.put("success", true);
            response.put("message", "Column mapping deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
}
