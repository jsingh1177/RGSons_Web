package MJC.RGSons.controller;

import MJC.RGSons.model.PriceMaster;
import MJC.RGSons.service.PriceMasterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prices")
@CrossOrigin(origins = "*")
public class PriceMasterController {

    @Autowired
    private PriceMasterService priceMasterService;

    @GetMapping("/item/{itemCode}")
    public ResponseEntity<Map<String, Object>> getPricesByItem(@PathVariable String itemCode) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<PriceMaster> prices = priceMasterService.getPricesByItemCode(itemCode);
            response.put("success", true);
            response.put("prices", prices);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error fetching prices: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/save-all")
    public ResponseEntity<Map<String, Object>> savePrices(@RequestBody List<PriceMaster> prices) {
        Map<String, Object> response = new HashMap<>();
        try {
            priceMasterService.savePrices(prices);
            response.put("success", true);
            response.put("message", "Prices saved successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error saving prices: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importPrices(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("message", "Please select a file to upload");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> importResult = priceMasterService.importPricesFromExcel(file);
            int savedCount = (int) importResult.get("savedCount");
            List<String> errors = (List<String>) importResult.get("errors");
            
            response.put("success", true);
            response.put("savedCount", savedCount);
            response.put("errors", errors);
            
            if (savedCount == 0 && !errors.isEmpty()) {
                response.put("message", "Failed to import prices. Please check errors.");
            } else if (!errors.isEmpty()) {
                response.put("message", "Imported " + savedCount + " prices with some errors.");
            } else {
                response.put("message", "Prices imported successfully (" + savedCount + " records).");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error importing prices: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
