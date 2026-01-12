package MJC.RGSons.config;

import MJC.RGSons.model.Category;
import MJC.RGSons.model.Item;
import MJC.RGSons.repository.CategoryRepository;
import MJC.RGSons.repository.ItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
@Order(1) // Run before other seeders
public class MasterDataSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final ItemRepository itemRepository;

    public MasterDataSeeder(CategoryRepository categoryRepository, ItemRepository itemRepository) {
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        seedCategories();
        seedItems();
    }

    private void seedCategories() {
        if (categoryRepository.count() == 0) {
            System.out.println("Seeding Categories...");
            Category c1 = new Category("CAT001", "Whisky");
            Category c2 = new Category("CAT002", "Beer");
            Category c3 = new Category("CAT003", "Wine");
            Category c4 = new Category("CAT004", "Rum");
            
            categoryRepository.saveAll(Arrays.asList(c1, c2, c3, c4));
        }
    }

    private void seedItems() {
        if (itemRepository.count() == 0) {
            System.out.println("Seeding Items...");
            
            // Item 1 - Whisky
            Item i1 = new Item("ITEM001", "Test Item 1", 150.0);
            i1.setCategoryCode("CAT001");
            i1.setBrandCode("BR001");
            
            // Item 2 - Beer
            Item i2 = new Item("ITEM002", "Test Item 2", 80.0);
            i2.setCategoryCode("CAT002");
            i2.setBrandCode("BR002");

            itemRepository.saveAll(Arrays.asList(i1, i2));
        }
    }
}
