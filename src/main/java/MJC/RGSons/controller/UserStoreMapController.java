package MJC.RGSons.controller;

import MJC.RGSons.model.UserStoreMap;
import MJC.RGSons.service.StoreService;
import MJC.RGSons.repository.UserStoreMapRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/stores")
@CrossOrigin(origins = "*")
public class UserStoreMapController {

    @Autowired
    private StoreService storeService;

    @Autowired
    private UserStoreMapRepository userStoreMapRepository;

    // DTO for request body
    public static class UserStoreMapRequest {
        private String userName;
        private String storeCode;

        public String getUserName() {
            return userName;
        }
        public void setUserName(String userName) {
            this.userName = userName;
        }
        public String getStoreCode() {
            return storeCode;
        }
        public void setStoreCode(String storeCode) {
            this.storeCode = storeCode;
        }
    }

    @PostMapping("/map-user")
    public ResponseEntity<Map<String, Object>> mapUserToStore(@RequestBody UserStoreMapRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (request.getUserName() == null || request.getUserName().isBlank() ||
                request.getStoreCode() == null || request.getStoreCode().isBlank()) {
                response.put("success", false);
                response.put("message", "userName and storeCode are required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Verify store exists
            var storeOpt = storeService.getStoreByCode(request.getStoreCode());
            if (storeOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "Store code not found: " + request.getStoreCode());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            // Idempotent check: if mapping exists, return OK
            UserStoreMap.UserStoreMapId id = new UserStoreMap.UserStoreMapId(request.getUserName(), request.getStoreCode());
            if (userStoreMapRepository.existsById(id)) {
                response.put("success", true);
                response.put("message", "Mapping already exists");
                response.put("mapping", Map.of(
                    "userName", request.getUserName(),
                    "storeCode", request.getStoreCode()
                ));
                return ResponseEntity.ok(response);
            }

            // Create mapping
            UserStoreMap mapping = new UserStoreMap(request.getUserName(), request.getStoreCode());
            userStoreMapRepository.save(mapping);

            response.put("success", true);
            response.put("message", "User mapped to store successfully");
            response.put("mapping", Map.of(
                "userName", mapping.getUserName(),
                "storeCode", mapping.getStoreCode()
            ));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error mapping user to store: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}