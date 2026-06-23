package MJC.RGSons.controller;

import MJC.RGSons.model.GroupMaster;
import MJC.RGSons.service.GroupMasterService;
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
@RequestMapping("/api/group-masters")
@CrossOrigin(origins = "*")
public class GroupMasterController {

    @Autowired
    private GroupMasterService groupMasterService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody GroupMaster groupMaster) {
        Map<String, Object> response = new HashMap<>();
        try {
            GroupMaster created = groupMasterService.create(groupMaster);
            response.put("success", true);
            response.put("message", "Accounting group created successfully");
            response.put("groupMaster", created);
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
            List<GroupMaster> list = groupMasterService.getAll();
            response.put("success", true);
            response.put("message", "Accounting groups retrieved successfully");
            response.put("groupMasters", list);
            response.put("count", list.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving accounting groups: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<GroupMaster> groupMaster = groupMasterService.getById(id);
            if (groupMaster.isPresent()) {
                response.put("success", true);
                response.put("message", "Accounting group found");
                response.put("groupMaster", groupMaster.get());
                return ResponseEntity.ok(response);
            }
            response.put("success", false);
            response.put("message", "Accounting group not found with id: " + id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving accounting group: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Integer id, @RequestBody GroupMaster details) {
        Map<String, Object> response = new HashMap<>();
        try {
            GroupMaster updated = groupMasterService.update(id, details);
            response.put("success", true);
            response.put("message", "Accounting group updated successfully");
            response.put("groupMaster", updated);
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
            groupMasterService.delete(id);
            response.put("success", true);
            response.put("message", "Accounting group deleted successfully");
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
            boolean exists = groupMasterService.codeExists(code);
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Accounting group code exists" : "Accounting group code is available");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking accounting group code: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
