package MJC.RGSons.controller;

import MJC.RGSons.model.Brand;
import MJC.RGSons.model.Category;
import MJC.RGSons.model.Item;
import MJC.RGSons.model.Size;
import MJC.RGSons.service.BrandService;
import MJC.RGSons.service.CategoryService;
import MJC.RGSons.service.ItemService;
import MJC.RGSons.service.SizeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import java.io.ByteArrayOutputStream;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/items")
@CrossOrigin(origins = "*")
public class ItemController {
    @Autowired
    private ItemService itemService;

    @Autowired
    private BrandService brandService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private SizeService sizeService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createItem(@RequestBody Item item) {
        Map<String, Object> response = new HashMap<>();
        try {
            Item createdItem = itemService.createItem(item);
            response.put("success", true);
            response.put("message", "Item created successfully");
            response.put("item", createdItem);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadItems(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        List<String> results = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int errorCount = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            // Skip header row
            if (rows.hasNext()) {
                rows.next();
            }

            while (rows.hasNext()) {
                Row row = rows.next();
                try {
                    // Check if row is empty (first cell empty)
                    Cell firstCell = row.getCell(0);
                    if (firstCell == null || getCellValueAsString(firstCell) == null || getCellValueAsString(firstCell).trim().isEmpty()) {
                        continue;
                    }

                    // Mapping:
                    // 0: Item Name
                    // 1: Brand Name
                    // 2: Category Name
                    // 3: MRP
                    // 4: Purchase Price
                    // 5: Size
                    // 6: Status

                    String itemName = getCellValueAsString(row.getCell(0));
                    String brandName = getCellValueAsString(row.getCell(1));
                    String categoryName = getCellValueAsString(row.getCell(2));
                    Double mrp = getCellValueAsDouble(row.getCell(3));
                    Double purchasePrice = getCellValueAsDouble(row.getCell(4));
                    String size = getCellValueAsString(row.getCell(5));
                    String statusStr = getCellValueAsString(row.getCell(6));

                    String result = itemService.importItem(itemName, brandName, categoryName, mrp, purchasePrice, size, statusStr);
                    
                    results.add("Row " + (row.getRowNum() + 1) + ": " + result);
                    if (result.startsWith("Error") || result.startsWith("Skipped")) {
                        // Format for CSV: Row, ItemName, ErrorMessage
                        String errorLine = (row.getRowNum() + 1) + "," + (itemName != null ? itemName.replace(",", " ") : "") + "," + result.replace(",", " ");
                        errors.add(errorLine);
                        errorCount++;
                    } else {
                        successCount++;
                    }

                } catch (Exception e) {
                    String msg = "Row " + (row.getRowNum() + 1) + ": Error - " + e.getMessage();
                    results.add(msg);
                    errors.add((row.getRowNum() + 1) + ",Unknown," + e.getMessage().replace(",", " "));
                    errorCount++;
                }
            }

            response.put("success", true);
            response.put("message", "Upload processed. Success: " + successCount + ", Errors: " + errorCount);
            response.put("details", results);
            response.put("errors", errors); // Send errors list for frontend to generate CSV
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Failed to process file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                }
                // Check if it's an integer
                double val = cell.getNumericCellValue();
                if (val == (long) val) {
                    return String.format("%d", (long) val);
                }
                return String.valueOf(val);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return null;
        }
    }

    private Double getCellValueAsDouble(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case NUMERIC:
                return cell.getNumericCellValue();
            case STRING:
                try {
                    return Double.parseDouble(cell.getStringCellValue());
                } catch (NumberFormatException e) {
                    return null;
                }
            case FORMULA:
                try {
                    return cell.getNumericCellValue();
                } catch (Exception e) {
                    return null;
                }
            default:
                return null;
        }
    }

    @GetMapping("/export")
    public ResponseEntity<Resource> exportItems() {
        try {
            List<Item> items = itemService.getAllItems();
            List<Brand> brands = brandService.getAllBrands();
            List<Category> categories = categoryService.getAllCategories();

            Map<String, String> brandMap = brands.stream()
                    .collect(Collectors.toMap(Brand::getCode, Brand::getName));
            Map<String, String> categoryMap = categories.stream()
                    .collect(Collectors.toMap(Category::getCode, Category::getName));

            try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                Sheet sheet = workbook.createSheet("Items");

                // Header
                String[] headers = {"Item Name", "Brand Name", "Category Name", "MRP", "Purchase Price", "Size", "Status"};
                Row headerRow = sheet.createRow(0);
                for (int i = 0; i < headers.length; i++) {
                    Cell cell = headerRow.createCell(i);
                    cell.setCellValue(headers[i]);
                    CellStyle style = workbook.createCellStyle();
                    Font font = workbook.createFont();
                    font.setBold(true);
                    style.setFont(font);
                    cell.setCellStyle(style);
                }

                // Data
                int rowIdx = 1;
                for (Item item : items) {
                    Row row = sheet.createRow(rowIdx++);
                    
                    row.createCell(0).setCellValue(item.getItemName() != null ? item.getItemName() : "");
                    
                    String brandName = brandMap.getOrDefault(item.getBrandCode(), "");
                    row.createCell(1).setCellValue(brandName);
                    
                    String categoryName = categoryMap.getOrDefault(item.getCategoryCode(), "");
                    row.createCell(2).setCellValue(categoryName);
                    
                    row.createCell(3).setCellValue(item.getMrp() != null ? item.getMrp() : 0.0);
                    row.createCell(4).setCellValue(item.getPurchasePrice() != null ? item.getPurchasePrice() : 0.0);
                    row.createCell(5).setCellValue(item.getSize() != null ? item.getSize() : "");
                    
                    row.createCell(6).setCellValue(item.getStatus() != null && item.getStatus() ? "Active" : "Inactive");
                }

                workbook.write(out);
                ByteArrayResource resource = new ByteArrayResource(out.toByteArray());

                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=items.xlsx")
                        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                        .body(resource);
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        System.out.println("getAllItems called. Page: " + page + ", Size: " + size + ", Search: '" + search + "'");
        Map<String, Object> response = new HashMap<>();
        try {
            Page<Item> itemPage;
            if (search != null && !search.trim().isEmpty()) {
                System.out.println("Searching for: " + search);
                itemPage = itemService.searchItems(search.trim(), page, size);
                System.out.println("Search found " + itemPage.getTotalElements() + " items");
            } else {
                System.out.println("Fetching all items");
                itemPage = itemService.getAllItems(page, size);
            }
            
            response.put("success", true);
            response.put("message", "Items retrieved successfully");
            response.put("items", itemPage.getContent());
            response.put("currentPage", itemPage.getNumber());
            response.put("totalItems", itemPage.getTotalElements());
            response.put("totalPages", itemPage.getTotalPages());
            response.put("count", itemPage.getNumberOfElements());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving items: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getItemById(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Item> item = itemService.getItemById(id);
            if (item.isPresent()) {
                response.put("success", true);
                response.put("message", "Item found");
                response.put("item", item.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Item not found with id: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving item: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<Map<String, Object>> getItemByCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Item> item = itemService.getItemByCode(code);
            if (item.isPresent()) {
                response.put("success", true);
                response.put("message", "Item found");
                response.put("item", item.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Item not found with code: " + code);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error retrieving item: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateItem(@PathVariable Integer id, @RequestBody Item itemDetails) {
        Map<String, Object> response = new HashMap<>();
        try {
            Item updatedItem = itemService.updateItem(id, itemDetails);
            response.put("success", true);
            response.put("message", "Item updated successfully");
            response.put("item", updatedItem);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteItem(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            itemService.deleteItem(id);
            response.put("success", true);
            response.put("message", "Item deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchItems(@RequestParam String query) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Item> items = itemService.searchItems(query);
            response.put("success", true);
            response.put("message", "Items search completed");
            response.put("items", items);
            response.put("count", items.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error searching items: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/check-code/{code}")
    public ResponseEntity<Map<String, Object>> checkItemCode(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        try {
            boolean exists = itemService.itemCodeExists(code);
            response.put("success", true);
            response.put("exists", exists);
            response.put("message", exists ? "Item code exists" : "Item code is available");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error checking item code: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
