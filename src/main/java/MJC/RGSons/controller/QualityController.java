package MJC.RGSons.controller;

import MJC.RGSons.model.Quality;
import MJC.RGSons.service.QualityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/qualities")
@CrossOrigin(origins = "*")
public class QualityController {
    
    @Autowired
    private QualityService qualityService;
    
    // Get all qualities
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllQualities() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Quality> qualities = qualityService.getAllQualities();
            response.put("success", true);
            response.put("message", "Qualities retrieved successfully");
            response.put("qualities", qualities);
            response.put("count", qualities.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving qualities: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Get quality by ID
    @GetMapping("/{id}")
    public ResponseEntity<Quality> getQualityById(@PathVariable String id) {
        try {
            Optional<Quality> quality = qualityService.getQualityById(id);
            if (quality.isPresent()) {
                return new ResponseEntity<>(quality.get(), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get quality by code
    @GetMapping("/code/{code}")
    public ResponseEntity<Quality> getQualityByCode(@PathVariable String code) {
        try {
            Optional<Quality> quality = qualityService.getQualityByCode(code);
            if (quality.isPresent()) {
                return new ResponseEntity<>(quality.get(), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get active qualities only
    @GetMapping("/active")
    public ResponseEntity<List<Quality>> getActiveQualities() {
        try {
            List<Quality> qualities = qualityService.getActiveQualities();
            return new ResponseEntity<>(qualities, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Get qualities by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Quality>> getQualitiesByStatus(@PathVariable Boolean status) {
        try {
            List<Quality> qualities = qualityService.getQualitiesByStatus(status);
            return new ResponseEntity<>(qualities, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Create new quality
    @PostMapping
    public ResponseEntity<Map<String, Object>> createQuality(@RequestBody Quality quality) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Validate quality data
            qualityService.validateQuality(quality);
            
            Quality createdQuality = qualityService.createQuality(quality);
            response.put("success", true);
            response.put("message", "Quality created successfully");
            response.put("quality", createdQuality);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error creating quality: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Update quality
    @PutMapping("/{id}")
    public ResponseEntity<Quality> updateQuality(@PathVariable String id, @RequestBody Quality quality) {
        try {
            Quality updatedQuality = qualityService.updateQuality(id, quality);
            return new ResponseEntity<>(updatedQuality, HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Delete quality (soft delete)
    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteQuality(@PathVariable String id) {
        try {
            qualityService.deleteQualityById(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Hard delete quality
    @DeleteMapping("/hard/{id}")
    public ResponseEntity<HttpStatus> hardDeleteQuality(@PathVariable String id) {
        try {
            qualityService.hardDeleteQualityById(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Check if quality code exists
    @GetMapping("/exists/{code}")
    public ResponseEntity<Boolean> checkQualityCodeExists(@PathVariable String code) {
        try {
            boolean exists = qualityService.existsByCode(code);
            return new ResponseEntity<>(exists, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // Advanced search with multiple criteria
    @GetMapping("/search/advanced")
    public ResponseEntity<List<Quality>> searchQualities(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Boolean status) {
        try {
            List<Quality> qualities = qualityService.searchQualities(name, status);
            return new ResponseEntity<>(qualities, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
