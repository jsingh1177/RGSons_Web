package MJC.RGSons.controller;

import MJC.RGSons.dto.SalesTransactionDTO;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Party;
import MJC.RGSons.model.TranItem;
import MJC.RGSons.model.TranLedger;
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

    @GetMapping("/drafts")
    public ResponseEntity<List<SalesTransactionDTO>> getDrafts(@RequestParam String storeCode) {
        List<SalesTransactionDTO> drafts = salesService.getDrafts(storeCode);
        return ResponseEntity.ok(drafts);
    }

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

    @GetMapping("/items/by-date")
    public ResponseEntity<List<TranItem>> getSalesItemsByDate(@RequestParam String date) {
        List<TranItem> items = salesService.getTranItemsByDate(date);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/items/by-store-date")
    public ResponseEntity<List<TranItem>> getSalesItemsByStoreAndDate(
            @RequestParam String store,
            @RequestParam String date) {
        List<TranItem> items = salesService.getTranItemsByStoreAndDate(date, store);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/ledgers/by-store-date")
    public ResponseEntity<List<TranLedger>> getSalesLedgersByStoreAndDate(
            @RequestParam String store,
            @RequestParam String date) {
        List<TranLedger> ledgers = salesService.getTranLedgersByStoreAndDate(date, store);
        return ResponseEntity.ok(ledgers);
    }

    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveTransaction(@RequestBody SalesTransactionDTO dto) {
        Map<String, Object> response = new HashMap<>();
        try {
            String invoiceNo = salesService.saveTransaction(dto);
            response.put("success", true);
            response.put("invoiceNo", invoiceNo);
            response.put("message", "Invoice saved successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error saving invoice: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @GetMapping("/customer-ledger/{partyCode}")
    public ResponseEntity<List<SalesTransactionDTO>> getCustomerLedger(@PathVariable String partyCode) {
        List<SalesTransactionDTO> ledger = salesService.getCustomerLedger(partyCode);
        return ResponseEntity.ok(ledger);
    }

    @GetMapping("/generate-invoice-no")
    public ResponseEntity<String> generateInvoiceNo(@RequestParam(required = false) String storeCode) {
        return ResponseEntity.ok(salesService.generateInvoiceNumber(storeCode));
    }

    @GetMapping("/SalesData")
    public ResponseEntity<Map<String, Object>> getSalesData() {
        Map<String, Object> response = new HashMap<>();
        List<SalesTransactionDTO> transactions = salesService.getSalesData();
        response.put("Invoices", transactions);
        return ResponseEntity.ok(response);
    }
}
