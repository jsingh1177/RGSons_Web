package MJC.RGSons.controller;

import MJC.RGSons.dto.CategorySalesDTO;
import MJC.RGSons.dto.StoreSalesDTO;
import MJC.RGSons.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping("/sales/store-wise")
    public ResponseEntity<List<StoreSalesDTO>> getStoreWiseSales(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<StoreSalesDTO> sales = reportService.getStoreWiseSales(startDate, endDate);
        return ResponseEntity.ok(sales);
    }

    @GetMapping("/sales/category-wise")
    public ResponseEntity<List<CategorySalesDTO>> getCategoryWiseSales(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<CategorySalesDTO> sales = reportService.getCategoryWiseSales(startDate, endDate);
        return ResponseEntity.ok(sales);
    }
}
