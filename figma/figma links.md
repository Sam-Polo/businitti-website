Здесь содержатся ссылки на фреймы (разделы, страницы) разрабатываемого сайта. Задача: повторить и следовать фигма-дизайну точь-в-точь используя Figma MCP.  
Перед началом работы лучше изучить всю структуру, подготовить и структурировать необходимые данные для вёрстки (основные цвета, шрифт, фото, иконки и т.п.).  
Extract color palette from Figma.  
Normalize similar colors.  
Create a design system (primary, secondary, text, background).  

# Figma MCP  
Работа с тобой (с Claude code) происходит через расширение внутри Cursor IDE. Так как было проблематично добавить MCP-сервер к расширению клауда корректно, ым пошли путём костылей.   
Работает через отдельный терминал npx:  
```bash
npx -y figma-developer-mcp --figma-api-key=figd_Whn9EtF7Yev6mW4CjnfL3wWanmiNVDEQQaKb7RlN
```

settings.json: 
```
{
  "mcpServers": {
    "figma": {
      "type": "http",
      "url": "http://127.0.0.1:3333/mcp"
    }
  }
}
```

# Desktop version (отступ у последнего блока и подвала 100 пт)

## Main Page Desktop  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3367&t=paU0OUUzMnmvOhtO-4  

## About brand Page Dekstop  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4766&t=paU0OUUzMnmvOhtO-4  

## Delivery and payment section Desktop  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4238&t=paU0OUUzMnmvOhtO-4  

## Garantee and refund section Desktop  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4298&t=paU0OUUzMnmvOhtO-4  

## Recommendations section Desktop  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4358&t=paU0OUUzMnmvOhtO-4  

## Contacts section Desktop  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4411&t=paU0OUUzMnmvOhtO-4  

## Item card modal Desktop  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4453&t=paU0OUUzMnmvOhtO-4  

## Cart modal Desktop  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4492&t=paU0OUUzMnmvOhtO-4  

## Categories pages Desktop  
Различие между страницами категорий - только описание, но в фигме категории продублированы сразу страницами.  
Товары будут браться из БД, поэтому сейчас достаточно заполнить как заглушкой первыми 8-ми товарами как в фигме, но без фото, чтобы не скачивать лишнее.  
Колье: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3470&t=paU0OUUzMnmvOhtO-4  
Браслеты: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3567&t=paU0OUUzMnmvOhtO-4  
Серьги: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3658&t=paU0OUUzMnmvOhtO-4  
Изделия из жемчуга: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3749&t=paU0OUUzMnmvOhtO-4  
Комплекты: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3840&t=paU0OUUzMnmvOhtO-4  
Пляжная коллекция: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3931&t=paU0OUUzMnmvOhtO-4  
Бохо-этно: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4022&t=paU0OUUzMnmvOhtO-4  

# Header Desktop
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3376&t=paU0OUUzMnmvOhtO-4

# footer desktop
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3450&t=paU0OUUzMnmvOhtO-4

# Mobile version (отступ у последнего блока и подвала 72 пт)

## Burger (burger именно Rectangle 3397)
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2748&t=paU0OUUzMnmvOhtO-4

## Item card Mobile  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3258&t=paU0OUUzMnmvOhtO-4

## Main page Mobile  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2349&t=paU0OUUzMnmvOhtO-4

## About brand page Mobile  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2443&t=paU0OUUzMnmvOhtO-4

## Delivery and payment page Mobile  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2557&t=paU0OUUzMnmvOhtO-4

## Garantee page  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2611&t=paU0OUUzMnmvOhtO-4

## Recommendations page  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2667&t=paU0OUUzMnmvOhtO-4

## Contacts page  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2715&t=paU0OUUzMnmvOhtO-4
  
## Categories pages Mobile  
Также как и в декстопной версии: различие между страницами категорий только описанием.  
Колье: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2782&t=paU0OUUzMnmvOhtO-4
Браслеты: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2850&t=paU0OUUzMnmvOhtO-4
Серьги: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2918&t=paU0OUUzMnmvOhtO-4
Изделия из жемчуга: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2986&t=paU0OUUzMnmvOhtO-4
Комплекты: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3054&t=paU0OUUzMnmvOhtO-4  
Пляжная коллекция https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3122&t=paU0OUUzMnmvOhtO-4  
Бохо-этно: https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-3190&t=paU0OUUzMnmvOhtO-4

# Header Mobile  
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-2352&t=paU0OUUzMnmvOhtO-4

# Footer Mobile
https://www.figma.com/design/lleDbNgOlhZyIwz1Vb4fvQ/businitti-%D1%81%D0%B0%D0%B9%D1%82?node-id=68-4923&t=paU0OUUzMnmvOhtO-4