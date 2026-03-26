package MJC.RGSons.controller;

import MJC.RGSons.dto.PurchaseSummaryDTO;
import MJC.RGSons.service.PurchaseSummaryReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/reports/purchase-summary")
@CrossOrigin(origins = "*")
public class PurchaseSummaryReportController {

    @Autowired
    private PurchaseSummaryReportService service;

    @GetMapping
    public ResponseEntity<List<PurchaseSummaryDTO>> getReport(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(service.getReport(startDate, endDate, storeCode, district));
    }

    @GetMapping("/districts")
    public ResponseEntity<List<String>> getDistricts() {
        return ResponseEntity.ok(service.getDistricts());
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> export(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String storeCode,
            @RequestParam(required = false) String district) throws IOException {
        ByteArrayInputStream in = service.exportToExcel(startDate, endDate, storeCode, district);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=PurchaseSummaryReport.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
