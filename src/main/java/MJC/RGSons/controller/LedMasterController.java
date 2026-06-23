package MJC.RGSons.controller;

import MJC.RGSons.model.LedMaster;
import MJC.RGSons.service.LedMasterService;
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
import java.util.Optional;

@RestController
@RequestMapping("/api/led-masters")
@CrossOrigin(origins = "*")
public class LedMasterController {

    @Autowired
    private LedMasterService ledMasterService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody LedMaster ledMaster) {
        Map<String, Object> response = new HashMap<>();
        try {
            LedMaster created = ledMasterService.create(ledMaster);
            response.put("success", true);
            response.put("message", "Ledger master created successfully");
            response.put("ledMaster", created);
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
            List<LedMaster> list = ledMasterService.getAll();
            response.put("success", true);
            response.put("message", "Ledger masters retrieved successfully");
            response.put("ledMasters", list);
            response.put("count", list.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving ledger masters: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/by-group-names")
    public ResponseEntity<Map<String, Object>> getByGroupNames(@RequestParam String names) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<String> groupNames = java.util.Arrays.stream(String.valueOf(names).split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .toList();

            List<LedMaster> list = ledMasterService.getActiveByGroupNames(groupNames);
            response.put("success", true);
            response.put("message", "Ledger masters retrieved successfully");
            response.put("ledMasters", list);
            response.put("count", list.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving ledger masters: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<LedMaster> ledMaster = ledMasterService.getById(id);
            if (ledMaster.isPresent()) {
                response.put("success", true);
                response.put("message", "Ledger master found");
                response.put("ledMaster", ledMaster.get());
                return ResponseEntity.ok(response);
            }
            response.put("success", false);
            response.put("message", "Ledger master not found with id: " + id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving ledger master: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Integer id, @RequestBody LedMaster details) {
        Map<String, Object> response = new HashMap<>();
        try {
            LedMaster updated = ledMasterService.update(id, details);
            response.put("success", true);
            response.put("message", "Ledger master updated successfully");
            response.put("ledMaster", updated);
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
            ledMasterService.delete(id);
            response.put("success", true);
            response.put("message", "Ledger master deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @GetMapping("/check-code/{code}")
    public ResponseEntity<Map<String, Object>> checkCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean exists = ledMasterService.codeExists(code);
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Ledger master code exists" : "Ledger master code is available");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking ledger master code: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
