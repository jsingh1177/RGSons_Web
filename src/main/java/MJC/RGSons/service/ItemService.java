package MJC.RGSons.service;

import MJC.RGSons.model.Item;
import MJC.RGSons.model.Brand;
import MJC.RGSons.model.Category;
import MJC.RGSons.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ItemService {
    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    private BrandService brandService;

    @Autowired
    private CategoryService categoryService;

    // Get all items
    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }
    
    // Get all items with pagination
    public Page<Item> getAllItems(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return itemRepository.findAll(pageable);
    }

    public Optional<Item> getItemById(Integer id) {
        return itemRepository.findById(id);
    }

    public Optional<Item> getItemByCode(String code) {
        return itemRepository.findByItemCode(code);
    }

    public List<Item> getItemsByStatus(Boolean status) {
        return itemRepository.findByStatus(status);
    }

    public List<Item> searchItemsByName(String name) {
        return itemRepository.findByItemNameContainingIgnoreCase(name);
    }

    public List<Item> searchItems(String query) {
        return itemRepository.searchByCodeOrName(query);
    }

    public Page<Item> searchItems(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return itemRepository.searchByCodeOrName(query, pageable);
    }

    public boolean itemCodeExists(String code) {
        return itemRepository.existsByItemCode(code);
    }

    public Item createItem(Item item) {
        // Code validation removed as it is auto-generated
        /*
        if (item.getItemCode() == null || item.getItemCode().trim().isEmpty()) {
            throw new RuntimeException("Item code is required");
        }
        */
        if (item.getItemName() == null || item.getItemName().trim().isEmpty()) {
            throw new RuntimeException("Item name is required");
        }

        // Generate Item Code from Sequence
        item.setItemCode(sequenceGeneratorService.generateSequence("Master_SEQ"));

        // Trim name
        item.setItemName(item.getItemName().trim());

        /*
        if (itemRepository.existsByItemCode(item.getItemCode())) {
            throw new RuntimeException("Item code already exists: " + item.getItemCode());
        }
        */

        if (itemRepository.existsByItemNameIgnoreCase(item.getItemName())) {
            throw new RuntimeException("Item name already exists: " + item.getItemName());
        }
        if (item.getStatus() == null) {
            item.setStatus(true);
        }
        item.setCreatedAt(LocalDateTime.now());
        return itemRepository.save(item);
    }

    public Item updateItem(Integer id, Item itemDetails) {
        Optional<Item> optionalItem = itemRepository.findById(id);
        if (optionalItem.isPresent()) {
            Item existingItem = optionalItem.get();

            // Trim name
            itemDetails.setItemName(itemDetails.getItemName().trim());

            /*
            if (!existingItem.getItemCode().equals(itemDetails.getItemCode())
                    && itemRepository.existsByItemCode(itemDetails.getItemCode())) {
                throw new RuntimeException("Item code already exists: " + itemDetails.getItemCode());
            }
            */

            if (!existingItem.getItemName().equalsIgnoreCase(itemDetails.getItemName())
                    && itemRepository.existsByItemNameIgnoreCase(itemDetails.getItemName())) {
                throw new RuntimeException("Item name already exists: " + itemDetails.getItemName());
            }
            // existingItem.setItemCode(itemDetails.getItemCode()); // Code is non-editable
            existingItem.setItemName(itemDetails.getItemName());
            existingItem.setMrp(itemDetails.getMrp());
            existingItem.setPurchasePrice(itemDetails.getPurchasePrice());
            existingItem.setBrandCode(itemDetails.getBrandCode());
            existingItem.setCategoryCode(itemDetails.getCategoryCode());
            existingItem.setSize(itemDetails.getSize());
            if (itemDetails.getStatus() != null) {
                existingItem.setStatus(itemDetails.getStatus());
            }
            existingItem.setUpdateAt(LocalDateTime.now());
            return itemRepository.save(existingItem);
        } else {
            throw new RuntimeException("Item not found with id: " + id);
        }
    }

    public String saveFromExcel(Item item) {
        Item existingItem = null;

        // 1. Try to find by Item Code
        if (item.getItemCode() != null && !item.getItemCode().trim().isEmpty()) {
            Optional<Item> byCode = itemRepository.findByItemCode(item.getItemCode().trim());
            if (byCode.isPresent()) {
                existingItem = byCode.get();
            }
        }

        // 2. If not found by Code, try by Name
        if (existingItem == null && item.getItemName() != null && !item.getItemName().trim().isEmpty()) {
            Optional<Item> byName = itemRepository.findByItemNameIgnoreCase(item.getItemName().trim());
            if (byName.isPresent()) {
                existingItem = byName.get();
            }
        }

        if (existingItem != null) {
            // Update existing
            if (item.getItemName() != null && !item.getItemName().isEmpty())
                existingItem.setItemName(item.getItemName().trim());
            if (item.getBrandCode() != null) existingItem.setBrandCode(item.getBrandCode());
            if (item.getCategoryCode() != null) existingItem.setCategoryCode(item.getCategoryCode());
            if (item.getMrp() != null) existingItem.setMrp(item.getMrp());
            if (item.getPurchasePrice() != null) existingItem.setPurchasePrice(item.getPurchasePrice());
            if (item.getSize() != null) existingItem.setSize(item.getSize());
            if (item.getStatus() != null) existingItem.setStatus(item.getStatus());
            
            existingItem.setUpdateAt(LocalDateTime.now());
            itemRepository.save(existingItem);
            return "Updated: " + existingItem.getItemCode();
        } else {
            // Create new
            if (item.getItemName() == null || item.getItemName().trim().isEmpty()) {
                return "Skipped: Item Name is missing";
            }
            
            // If Code is missing, generate it
            if (item.getItemCode() == null || item.getItemCode().trim().isEmpty()) {
                item.setItemCode(sequenceGeneratorService.generateSequence("Master_SEQ"));
            }
            // else use provided code (assuming it's new custom code)
            
            item.setItemName(item.getItemName().trim());
            if (item.getStatus() == null) item.setStatus(true);
            item.setCreatedAt(LocalDateTime.now());
            item.setUpdateAt(LocalDateTime.now());
            
            try {
                itemRepository.save(item);
                return "Created: " + item.getItemCode();
            } catch (Exception e) {
                return "Error: " + e.getMessage();
            }
        }
    }

    public String importItem(String itemName, String brandName, String categoryName, Double mrp, Double purchasePrice, String size, String statusStr) {
        try {
            Item item = new Item();
            
            // 1. Resolve Brand
            if (brandName != null && !brandName.trim().isEmpty()) {
                String finalBrandName = brandName.trim();
                Optional<Brand> brandOpt = brandService.getBrandByName(finalBrandName);
                if (brandOpt.isPresent()) {
                    item.setBrandCode(brandOpt.get().getCode());
                } else {
                    // Create new Brand
                    Brand newBrand = new Brand();
                    newBrand.setName(finalBrandName);
                    newBrand.setStatus(true);
                    // Code generated in createBrand
                    Brand createdBrand = brandService.createBrand(newBrand);
                    item.setBrandCode(createdBrand.getCode());
                }
            }

            // 2. Resolve Category
            if (categoryName != null && !categoryName.trim().isEmpty()) {
                String finalCategoryName = categoryName.trim();
                Optional<Category> categoryOpt = categoryService.getCategoryByName(finalCategoryName);
                if (categoryOpt.isPresent()) {
                    item.setCategoryCode(categoryOpt.get().getCode());
                } else {
                    // Create new Category
                    Category newCategory = new Category();
                    newCategory.setName(finalCategoryName);
                    newCategory.setStatus(true);
                    // Code generated in createCategory
                    Category createdCategory = categoryService.createCategory(newCategory);
                    item.setCategoryCode(createdCategory.getCode());
                }
            }

            // 3. Set Item Fields
            item.setItemName(itemName);
            item.setMrp(mrp);
            item.setPurchasePrice(purchasePrice);
            item.setSize(size);
            
            // 4. Resolve Status
            boolean status = true;
            if (statusStr != null) {
                String s = statusStr.trim().toLowerCase();
                if (s.equals("false") || s.equals("inactive") || s.equals("0") || s.equals("no")) {
                    status = false;
                }
            }
            item.setStatus(status);

            // 5. Save/Update using existing logic
            // Note: Item Code will be generated in saveFromExcel if not present
            return saveFromExcel(item);

        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    public void deleteItem(Integer id) {
        Optional<Item> optionalItem = itemRepository.findById(id);
        if (optionalItem.isPresent()) {
            Item item = optionalItem.get();
            item.setStatus(false);
            item.setUpdateAt(LocalDateTime.now());
            itemRepository.save(item);
        } else {
            throw new RuntimeException("Item not found with id: " + id);
        }
    }
}
