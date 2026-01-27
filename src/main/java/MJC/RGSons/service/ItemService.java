package MJC.RGSons.service;

import MJC.RGSons.model.Item;
import MJC.RGSons.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
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

    // Get all items
    public List<Item> getAllItems() {
        return itemRepository.findAll();
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
