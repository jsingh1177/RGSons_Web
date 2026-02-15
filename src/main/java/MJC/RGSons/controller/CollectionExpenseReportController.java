package MJC.RGSons.controller;

import MJC.RGSons.dto.CollectionExpenseDTO;
import MJC.RGSons.service.CollectionExpenseReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.ByteArrayInputStream;
import java.io.IOException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports/collection-expense")
@CrossOrigin(origins = "*")
public class CollectionExpenseReportController {

    @Autowired
    private CollectionExpenseReportService reportService;

    @GetMapping
    public ResponseEntity<List<CollectionExpenseDTO>> getReport(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(reportService.getReport(startDate, endDate, zone, district));
    }

    @GetMapping("/columns")
    public ResponseEntity<Map<String, List<String>>> getReportColumns() {
        return ResponseEntity.ok(reportService.getReportColumns());
    }

    @GetMapping("/zones")
    public ResponseEntity<List<String>> getZones() {
        return ResponseEntity.ok(reportService.getZones());
    }

    @GetMapping("/districts")
    public ResponseEntity<List<String>> getDistricts(@RequestParam(required = false) String zone) {
        return ResponseEntity.ok(reportService.getDistricts(zone));
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> exportReport(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String district) throws IOException {

        ByteArrayInputStream in = reportService.exportReport(startDate, endDate, zone, district);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=CollectionExpenseReport.xlsx");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
