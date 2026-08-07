package MJC.RGSons.controller;

import MJC.RGSons.service.OpeningBalanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/opening-balance")
@CrossOrigin(origins = "*")
public class OpeningBalanceController {

    @Autowired
    private OpeningBalanceService openingBalanceService;

    @GetMapping("/matrix")
    public ResponseEntity<Map<String, Object>> getMatrix(
            @RequestParam String storeCode,
            @RequestParam(required = false) String tranDate,
            @RequestParam(required = false) String categoryCode
    ) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        LocalDate d = (tranDate != null && !tranDate.isBlank()) ? LocalDate.parse(tranDate) : null;
        response.put("data", openingBalanceService.getMatrix(storeCode, categoryCode, d));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/save-matrix")
    public ResponseEntity<Map<String, Object>> saveMatrix(@RequestBody Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        try {
            String storeCode = payload.get("storeCode") != null ? payload.get("storeCode").toString() : null;
            String tranDateStr = payload.get("tranDate") != null ? payload.get("tranDate").toString() : null;
            Object rowsObj = payload.get("rows");

            if (storeCode == null || storeCode.isBlank()) {
                response.put("success", false);
                response.put("message", "Store is required");
                return ResponseEntity.badRequest().body(response);
            }
            if (tranDateStr == null || tranDateStr.isBlank()) {
                response.put("success", false);
                response.put("message", "Date is required");
                return ResponseEntity.badRequest().body(response);
            }
            if (!(rowsObj instanceof List<?> rows)) {
                response.put("success", false);
                response.put("message", "Rows are required");
                return ResponseEntity.badRequest().body(response);
            }

            LocalDate tranDate = LocalDate.parse(tranDateStr);
            List<Map<String, Object>> rowMaps = new ArrayList<>();
            for (Object rowObj : rows) {
                if (!(rowObj instanceof Map<?, ?> m)) {
                    response.put("success", false);
                    response.put("message", "Invalid row data");
                    return ResponseEntity.badRequest().body(response);
                }
                Map<String, Object> row = new HashMap<>();
                for (Map.Entry<?, ?> e : m.entrySet()) {
                    if (e.getKey() == null) continue;
                    row.put(String.valueOf(e.getKey()), e.getValue());
                }
                rowMaps.add(row);
            }
            Map<String, Object> saveResult = openingBalanceService.saveMatrixAndRefreshSnapshot(storeCode, tranDate, rowMaps);

            response.put("success", true);
            response.put("message", "Opening balance saved");
            response.putAll(saveResult);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error saving opening balance: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> export(
            @RequestParam String storeCode,
            @RequestParam(required = false) String tranDate,
            @RequestParam(required = false) String categoryCode
    ) {
        try {
            LocalDate d = (tranDate != null && !tranDate.isBlank()) ? LocalDate.parse(tranDate) : null;
            var in = openingBalanceService.exportFlatToExcel(storeCode, categoryCode, d);
            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=opening_balance.xlsx");
            return ResponseEntity.ok()
                    .headers(headers)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(new InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String tranDate,
            @RequestParam(required = false) String categoryCode
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            LocalDate d = (tranDate != null && !tranDate.isBlank()) ? LocalDate.parse(tranDate) : null;
            Map<String, Object> result = openingBalanceService.importMatrixFromExcel(file, storeCode != null ? storeCode : "", categoryCode, d);
            response.put("success", true);
            response.putAll(result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error importing opening balance: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Map<String, Object>> deleteMatrix(
            @RequestParam String storeCode,
            @RequestParam String tranDate,
            @RequestParam(required = false) String categoryCode
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            LocalDate d = LocalDate.parse(tranDate);
            int deleted = openingBalanceService.deleteMatrix(storeCode, categoryCode, d);
            response.put("success", true);
            response.put("deleted", deleted);
            response.put("message", "Opening balance deleted");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error deleting opening balance: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
