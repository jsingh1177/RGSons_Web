package MJC.RGSons;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
		"spring.main.lazy-initialization=true",
		"spring.autoconfigure.exclude=" +
				"org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
				"org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration," +
				"org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration"
})
class RgSonsApplicationTests {

	@Test
	void contextLoads() {
	}

}
