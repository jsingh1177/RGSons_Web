package MJC.RGSons.controller;

import MJC.RGSons.model.Party;
import MJC.RGSons.service.PartyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/parties")
@CrossOrigin(origins = "*")
public class PartyController {

    @Autowired
    private PartyService partyService;

    // Create a new party
    @PostMapping
    public ResponseEntity<Map<String, Object>> createParty(@RequestBody Party party) {
        Map<String, Object> response = new HashMap<>();
        try {
            Party createdParty = partyService.createParty(party);
            response.put("success", true);
            response.put("message", "Party created successfully");
            response.put("party", createdParty);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // Get all parties
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllParties() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Party> parties = partyService.getAllParties();
            response.put("success", true);
            response.put("message", "Parties retrieved successfully");
            response.put("parties", parties);
            response.put("count", parties.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving parties: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Get party by ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPartyById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Party> party = partyService.getPartyById(id);
            if (party.isPresent()) {
                response.put("success", true);
                response.put("message", "Party found");
                response.put("party", party.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Party not found with id: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving party: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Update party
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateParty(@PathVariable String id, @RequestBody Party partyDetails) {
        Map<String, Object> response = new HashMap<>();
        try {
            Party updatedParty = partyService.updateParty(id, partyDetails);
            response.put("success", true);
            response.put("message", "Party updated successfully");
            response.put("party", updatedParty);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // Delete party
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteParty(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            partyService.deleteParty(id);
            response.put("success", true);
            response.put("message", "Party deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    // Check if party code exists
    @GetMapping("/check-code/{code}")
    public ResponseEntity<Map<String, Object>> checkPartyCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean exists = partyService.partyCodeExists(code);
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Party code exists" : "Party code is available");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking party code: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
