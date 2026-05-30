package MJC.RGSons.controller;

import MJC.RGSons.model.ItemUomMap;
import MJC.RGSons.service.ItemUomMapService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/item-uom-map")
@CrossOrigin(origins = "*")
public class ItemUomMapController {
    @Autowired
    private ItemUomMapService itemUomMapService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getByItemAndSize(
            @RequestParam String itemCode,
            @RequestParam(required = false) String sizeCode
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<ItemUomMap> rows = itemUomMapService.getByItemAndSize(itemCode, sizeCode);
            response.put("success", true);
            response.put("rows", rows);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> save(@RequestBody ItemUomMap row) {
        Map<String, Object> response = new HashMap<>();
        try {
            ItemUomMap saved = itemUomMapService.save(row);
            response.put("success", true);
            response.put("row", saved);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            itemUomMapService.delete(id);
            response.put("success", true);
            response.put("message", "Deleted");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

