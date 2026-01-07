package MJC.RGSons.controller;

import MJC.RGSons.model.StateMaster;
import MJC.RGSons.repository.StateMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/states")
@CrossOrigin(origins = "*")
public class StateMasterController {

    @Autowired
    private StateMasterRepository repository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllStates() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<StateMaster> states = repository.findAll();
            response.put("success", true);
            response.put("message", "States retrieved successfully");
            response.put("states", states);
            response.put("count", states.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving states: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
