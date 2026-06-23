package MJC.RGSons.controller;

import MJC.RGSons.dto.ItemPartyPurchaseDTO;
import MJC.RGSons.service.PurchaseDetailReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports/purchase-detail")
@CrossOrigin(origins = "*")
public class PurchaseDetailReportController {

    @Autowired
    private PurchaseDetailReportService service;

    @GetMapping
    public ResponseEntity<List<ItemPartyPurchaseDTO>> getReport(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String partyCode) {
        return ResponseEntity.ok(service.getReport(startDate, endDate, categoryCode, partyCode));
    }

    @GetMapping("/detail")
    public ResponseEntity<List<Map<String, Object>>> getPurchaseDetail(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String partyCode,
            @RequestParam(required = false) String supplierName
    ) {
        return ResponseEntity.ok(service.getPurchaseDetail(startDate, endDate, storeCode, district, partyCode, supplierName));
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> export(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String partyCode) throws IOException {
        ByteArrayInputStream in = service.exportToExcel(startDate, endDate, categoryCode, partyCode);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=ItemWisePartyWisePurchase.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }

    @GetMapping("/detail/export")
    public ResponseEntity<InputStreamResource> exportPurchaseDetail(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String partyCode,
            @RequestParam(required = false) String supplierName
    ) throws IOException {
        ByteArrayInputStream in = service.exportPurchaseDetailToExcel(startDate, endDate, storeCode, district, partyCode, supplierName);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=PurchaseDetailReport.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }

    @PostMapping("/detail/export-view")
    public ResponseEntity<InputStreamResource> exportPurchaseDetailView(@RequestBody Map<String, Object> payload) throws IOException {
        Object rowsObj = payload.get("rows");
        List<Map<String, Object>> rows = new ArrayList<>();
        if (rowsObj instanceof List<?> rawRows) {
            for (Object rowObj : rawRows) {
                if (!(rowObj instanceof Map<?, ?> m)) continue;
                Map<String, Object> row = new HashMap<>();
                for (Map.Entry<?, ?> e : m.entrySet()) {
                    if (e.getKey() == null) continue;
                    row.put(String.valueOf(e.getKey()), e.getValue());
                }
                rows.add(row);
            }
        }

        Object colsObj = payload.get("columns");
        List<String> columns = colsObj instanceof List ? ((List<?>) colsObj).stream().map(v -> v != null ? String.valueOf(v) : "").toList() : List.of();

        ByteArrayInputStream in = service.exportPurchaseDetailViewToExcel(rows, columns);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=PurchaseDetailReport.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
