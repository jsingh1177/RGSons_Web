package MJC.RGSons.controller;

import MJC.RGSons.dto.ClosingStockReportDTO;
import MJC.RGSons.service.ClosingStockReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/reports/closing-stock")
@CrossOrigin(origins = "*")
public class ClosingStockReportController {

    @Autowired
    private ClosingStockReportService service;

    @GetMapping("/zones")
    public ResponseEntity<List<String>> getZones() {
        return ResponseEntity.ok(service.getZones());
    }

    @GetMapping("/districts")
    public ResponseEntity<List<String>> getDistricts(@RequestParam(required = false) String zone) {
        return ResponseEntity.ok(service.getDistricts(zone));
    }

    @GetMapping
    public ResponseEntity<List<ClosingStockReportDTO>> getReport(
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String district,
            @RequestParam(defaultValue = "MRP") String valuationMethod) {
        return ResponseEntity.ok(service.getReportData(zone, district, valuationMethod));
    }

    @GetMapping("/columns")
    public ResponseEntity<List<String>> getColumns(
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String district) {
        return ResponseEntity.ok(service.getDynamicColumns(zone, district));
    }

    @GetMapping("/export")
    public ResponseEntity<InputStreamResource> exportReport(
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String district,
            @RequestParam(defaultValue = "MRP") String valuationMethod) throws IOException {
        
        ByteArrayInputStream in = service.exportToExcel(zone, district, valuationMethod);
        
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=ClosingStockReport.xlsx");
        
        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}
