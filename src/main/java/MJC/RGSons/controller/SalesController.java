package MJC.RGSons.controller;

import MJC.RGSons.dto.SalesTransactionDTO;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Party;
import MJC.RGSons.service.SalesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*")
public class SalesController {

    @Autowired
    private SalesService salesService;

    @GetMapping("/parties")
    public List<Party> getAllParties() {
        return salesService.getPartiesByType("Vendor");
    }

    @GetMapping("/items")
    public List<Item> getAllItems() {
        return salesService.getAllItems();
    }

    @GetMapping("/items/{code}")
    public ResponseEntity<Item> getItemByCode(@PathVariable String code) {
        Optional<Item> item = salesService.getItemByCode(code);
        return item.map(ResponseEntity::ok)
                   .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/save")
    public ResponseEntity<String> saveTransaction(@RequestBody SalesTransactionDTO dto) {
        try {
            salesService.saveTransaction(dto);
            return ResponseEntity.ok("Invoice saved successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error saving invoice: " + e.getMessage());
        }
    }
    
    @GetMapping("/generate-invoice-no")
    public ResponseEntity<String> generateInvoiceNo() {
        return ResponseEntity.ok(salesService.generateInvoiceNumber());
    }

    @GetMapping("/SalesData")
    public ResponseEntity<Map<String, Object>> getSalesData() {
        Map<String, Object> response = new HashMap<>();
        response.put("Invoices", salesService.getSalesData());
        return ResponseEntity.ok(response);
    }
}
