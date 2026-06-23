package MJC.RGSons.controller;

import MJC.RGSons.model.ReportMaster;
import MJC.RGSons.service.ReportMasterService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/report-masters")
@CrossOrigin(origins = "*")
public class ReportMasterController {

    @Autowired
    private ReportMasterService reportMasterService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody ReportMaster reportMaster) {
        Map<String, Object> response = new HashMap<>();
        try {
            ReportMaster created = reportMasterService.create(reportMaster);
            response.put("success", true);
            response.put("message", "Report created successfully");
            response.put("reportMaster", created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<ReportMaster> list = reportMasterService.getAll();
            response.put("success", true);
            response.put("message", "Reports retrieved successfully");
            response.put("reportMasters", list);
            response.put("count", list.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving reports: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<ReportMaster> reportMaster = reportMasterService.getById(id);
            if (reportMaster.isPresent()) {
                response.put("success", true);
                response.put("message", "Report found");
                response.put("reportMaster", reportMaster.get());
                return ResponseEntity.ok(response);
            }
            response.put("success", false);
            response.put("message", "Report not found with id: " + id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving report: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Integer id, @RequestBody ReportMaster details) {
        Map<String, Object> response = new HashMap<>();
        try {
            ReportMaster updated = reportMasterService.update(id, details);
            response.put("success", true);
            response.put("message", "Report updated successfully");
            response.put("reportMaster", updated);
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
            reportMasterService.delete(id);
            response.put("success", true);
            response.put("message", "Report deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
}
