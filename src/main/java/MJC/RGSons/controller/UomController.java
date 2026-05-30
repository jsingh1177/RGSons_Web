package MJC.RGSons.controller;

import MJC.RGSons.model.Uom;
import MJC.RGSons.service.UomService;
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
@RequestMapping("/api/uoms")
@CrossOrigin(origins = "*")
public class UomController {

    @Autowired
    private UomService uomService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllUoms() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Uom> uoms = uomService.getAllUoms();
            response.put("success", true);
            response.put("message", "UOMs retrieved successfully");
            response.put("uoms", uoms);
            response.put("count", uoms.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving UOMs: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Uom> getUomById(@PathVariable Integer id) {
        try {
            Optional<Uom> uom = uomService.getUomById(id);
            return uom.map(value -> new ResponseEntity<>(value, HttpStatus.OK)).orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<Uom> getUomByCode(@PathVariable String code) {
        try {
            Optional<Uom> uom = uomService.getUomByCode(code);
            return uom.map(value -> new ResponseEntity<>(value, HttpStatus.OK)).orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/active")
    public ResponseEntity<List<Uom>> getActiveUoms() {
        try {
            return new ResponseEntity<>(uomService.getActiveUoms(), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Uom>> getUomsByStatus(@PathVariable Boolean status) {
        try {
            return new ResponseEntity<>(uomService.getUomsByStatus(status), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createUom(@RequestBody Uom uom) {
        Map<String, Object> response = new HashMap<>();
        try {
            uomService.validateUom(uom);
            Uom created = uomService.createUom(uom);
            response.put("success", true);
            response.put("message", "UOM created successfully");
            response.put("uom", created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error creating UOM: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Uom> updateUom(@PathVariable Integer id, @RequestBody Uom details) {
        try {
            uomService.validateUom(details);
            return new ResponseEntity<>(uomService.updateUom(id, details), HttpStatus.OK);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteUom(@PathVariable Integer id) {
        try {
            uomService.deleteUomById(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<Uom>> searchUomsByName(@RequestParam String name) {
        try {
            return new ResponseEntity<>(uomService.searchUomsByName(name), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
