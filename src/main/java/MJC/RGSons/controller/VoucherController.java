package MJC.RGSons.controller;

import MJC.RGSons.model.VoucherConfig;
import MJC.RGSons.service.VoucherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/voucher-config")
@CrossOrigin(origins = "*")
public class VoucherController {

    @Autowired
    private VoucherService voucherService;

    @GetMapping("/{voucherType}")
    public ResponseEntity<?> getConfig(@PathVariable String voucherType) {
        try {
            VoucherConfig config = voucherService.getVoucherConfig(voucherType);
            if (config != null) {
                return ResponseEntity.ok(Map.of("success", true, "config", config));
            } else {
                return ResponseEntity.ok(Map.of("success", false, "message", "Configuration not found"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveConfig(@RequestBody VoucherConfig config) {
        try {
            VoucherConfig saved = voucherService.saveVoucherConfig(config);
            return ResponseEntity.ok(Map.of("success", true, "config", saved, "message", "Configuration saved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/preview")
    public ResponseEntity<?> generatePreview(@RequestBody Map<String, String> request) {
        try {
            String voucherType = request.get("voucherType");
            String storeCode = request.get("storeCode"); // Optional, for preview
            if (storeCode == null) storeCode = "S01"; // Default for preview
            
            String preview = voucherService.generatePreview(voucherType, storeCode);
            return ResponseEntity.ok(Map.of("success", true, "preview", preview));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
