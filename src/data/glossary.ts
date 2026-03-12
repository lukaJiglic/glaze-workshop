export interface GlossaryEntry {
  term: string
  plain: string
  analogy?: string
  whyItMatters: string
}

export const glossary = new Map<string, GlossaryEntry>([
  ['cone', {
    term: 'Cone',
    plain: 'A measure of heat-work in a kiln — it combines temperature and time. Pyrometric cones are small ceramic pyramids that bend at a specific heat-work level.',
    analogy: 'Like an oven thermometer that also tracks how long you\'ve been baking.',
    whyItMatters: 'Choosing the wrong cone can under-fire (weak, chalky) or over-fire (melted, warped) your work.'
  }],
  ['firing range', {
    term: 'Firing Range',
    plain: 'The span of cone temperatures at which a clay body or glaze performs correctly. Most glazes are formulated for a specific range.',
    analogy: 'Like the temperature range on a cake recipe — too low and it\'s raw, too high and it burns.',
    whyItMatters: 'A glaze designed for one range won\'t work at another; matching range to your clay is essential.'
  }],
  ['low-fire', {
    term: 'Low Fire',
    plain: 'Ceramics fired to roughly cone 06–02 (about 1000–1120 °C / 1830–2050 °F). Bright colors are easier to achieve at these temperatures.',
    whyItMatters: 'Great for beginners — lower energy cost, vivid colors, and most hobby kilns reach these temps easily.'
  }],
  ['mid-fire', {
    term: 'Mid Fire',
    plain: 'Ceramics fired to roughly cone 5–7 (about 1180–1240 °C / 2160–2260 °F). A popular sweet spot between durability and color variety.',
    whyItMatters: 'The most common range for functional pottery — strong enough for daily use, with a wide color palette.'
  }],
  ['high-fire', {
    term: 'High Fire',
    plain: 'Ceramics fired to cone 8–10 (about 1260–1300 °C / 2300–2380 °F). Produces very dense, durable ware.',
    whyItMatters: 'High-fire stoneware and porcelain are the strongest, most water-resistant ceramics you can make.'
  }],
  ['raku', {
    term: 'Raku',
    plain: 'A low-fire technique where pots are pulled from the kiln while red-hot and placed in combustible material for dramatic surface effects.',
    analogy: 'Like flash-frying instead of slow roasting — fast, dramatic, and a little unpredictable.',
    whyItMatters: 'Raku pieces are decorative, not food-safe. It\'s exciting but the results are hard to repeat exactly.'
  }],
  ['atmosphere', {
    term: 'Atmosphere',
    plain: 'The air environment inside the kiln during firing. It can be oxygen-rich (oxidation), oxygen-starved (reduction), or balanced (neutral).',
    whyItMatters: 'The same glaze recipe can look completely different depending on the kiln atmosphere.'
  }],
  ['oxidation', {
    term: 'Oxidation',
    plain: 'Firing with plenty of oxygen, typical of electric kilns. Colors tend to be clean and predictable.',
    analogy: 'Like cooking on an electric stove — even, steady heat with no smoke.',
    whyItMatters: 'Most beginners fire in oxidation. Results are repeatable and easier to control.'
  }],
  ['reduction', {
    term: 'Reduction',
    plain: 'Firing in an oxygen-starved atmosphere, typical of gas kilns. The lack of oxygen pulls oxygen from the glaze, changing colors dramatically.',
    analogy: 'Like smothering a campfire — the smoke changes everything it touches.',
    whyItMatters: 'Reduction creates unique effects (iron reds, celadons) that can\'t be replicated in electric kilns.'
  }],
  ['neutral', {
    term: 'Neutral',
    plain: 'A kiln atmosphere that is neither oxidizing nor reducing — a balanced mix of gases.',
    whyItMatters: 'Some special glazes perform best in a neutral atmosphere, sitting between the two extremes.'
  }],
  ['flux', {
    term: 'Flux',
    plain: 'A material that lowers the melting point of a glaze, helping silica turn into glass at reachable temperatures.',
    analogy: 'Like adding salt to ice — it makes things melt at a lower temperature.',
    whyItMatters: 'Without flux, glaze ingredients wouldn\'t melt in your kiln. The type of flux also affects texture and color.'
  }],
  ['glass former', {
    term: 'Glass Former',
    plain: 'The ingredient that actually becomes glass in a glaze — almost always silica (SiO₂). It\'s the backbone of every glaze.',
    analogy: 'Like flour in bread — it provides the main structure.',
    whyItMatters: 'Too little and the glaze won\'t form a proper glass surface; too much and it won\'t melt.'
  }],
  ['stabilizer', {
    term: 'Stabilizer',
    plain: 'A material (usually alumina) that keeps the melted glaze from running off the pot. It adds viscosity.',
    analogy: 'Like adding cornstarch to a sauce — it thickens things up so they stay put.',
    whyItMatters: 'Without enough stabilizer, your glaze will slide right off the pot and stick to the kiln shelf.'
  }],
  ['feldspar', {
    term: 'Feldspar',
    plain: 'A natural mineral that acts as both flux and glass former. It\'s the most common glaze ingredient in mid- and high-fire recipes.',
    whyItMatters: 'Feldspar is the workhorse of most glazes — understanding it helps you read and tweak recipes.'
  }],
  ['kaolin', {
    term: 'Kaolin',
    plain: 'A pure white clay, also called china clay. In glazes it adds alumina (a stabilizer) and helps the glaze stay in suspension.',
    whyItMatters: 'Kaolin keeps your glaze from settling into a brick at the bottom of the bucket.'
  }],
  ['silica', {
    term: 'Silica',
    plain: 'Silicon dioxide (SiO₂) — the main glass-forming oxide. Added as flint or quartz in glaze recipes.',
    analogy: 'The "glass" in glaze, literally. Sand is mostly silica.',
    whyItMatters: 'Adjusting silica changes the glaze surface from matte to glossy and affects durability.'
  }],
  ['whiting', {
    term: 'Whiting',
    plain: 'Calcium carbonate (CaCO₃), a common flux in mid- and high-fire glazes. It promotes a hard, durable glass.',
    whyItMatters: 'Whiting is cheap, reliable, and in almost every stoneware glaze recipe you\'ll encounter.'
  }],
  ['frit', {
    term: 'Frit',
    plain: 'A pre-melted, ground-up glass used in glazes. Manufacturers melt raw materials together and then grind the result into a powder.',
    analogy: 'Like pre-made pie crust — the hard work is already done for you.',
    whyItMatters: 'Frits make toxic materials (like lead, boron) safe to handle and give more consistent results.'
  }],
  ['ball clay', {
    term: 'Ball Clay',
    plain: 'A fine-grained, plastic clay used in both clay bodies and glazes. It improves workability and suspension.',
    whyItMatters: 'Ball clay helps glaze stay mixed in the bucket and adhere to the pot before firing.'
  }],
  ['matte', {
    term: 'Matte',
    plain: 'A glaze surface that is smooth but not shiny — it has a soft, velvety look with no gloss.',
    analogy: 'Like matte photo paper versus glossy.',
    whyItMatters: 'Matte glazes are popular for modern, tactile pottery. They can feel wonderful to hold.'
  }],
  ['satin', {
    term: 'Satin',
    plain: 'A glaze surface between matte and glossy — it has a soft sheen, like satin fabric.',
    whyItMatters: 'Satin finishes hide fingerprints better than glossy and feel smoother than matte.'
  }],
  ['glossy', {
    term: 'Glossy',
    plain: 'A shiny, reflective glaze surface. Light bounces off it like glass.',
    whyItMatters: 'Glossy glazes are the easiest to clean and show colors at their most vibrant.'
  }],
  ['crackle', {
    term: 'Crackle',
    plain: 'A glaze with an intentional network of fine cracks in the surface, created by mismatching the glaze\'s thermal expansion with the clay body.',
    analogy: 'Like the cracked pattern on old china — but done on purpose.',
    whyItMatters: 'Crackle is decorative but not food-safe (bacteria hide in the cracks), so it\'s best for display pieces.'
  }],
  ['crystalline', {
    term: 'Crystalline',
    plain: 'A glaze that grows visible crystal formations during cooling. Requires very specific firing schedules.',
    analogy: 'Like growing rock candy in a jar — slow cooling lets crystals form.',
    whyItMatters: 'Crystalline glazes are stunning but advanced — they tend to run heavily and need special kiln furniture.'
  }],
  ['opaque', {
    term: 'Opaque',
    plain: 'A glaze you can\'t see through. It completely hides the clay body underneath.',
    whyItMatters: 'Opaque glazes cover dark clay bodies and underglaze decoration. Good for a clean, solid look.'
  }],
  ['transparent', {
    term: 'Transparent',
    plain: 'A clear glaze that lets the clay or underglaze decoration show through.',
    analogy: 'Like a clear coat of nail polish — it protects and adds shine without hiding what\'s underneath.',
    whyItMatters: 'Transparent glazes are essential for showing off underglaze painting and the natural beauty of clay.'
  }],
  ['variegated', {
    term: 'Variegated',
    plain: 'A glaze that shows multiple colors or tones across its surface, often breaking differently over texture.',
    whyItMatters: 'Variegated glazes add visual interest and make each piece unique.'
  }],
  ['umf', {
    term: 'UMF (Unity Molecular Formula)',
    plain: 'A way of expressing a glaze recipe as a ratio of oxides, with fluxes normalized to 1.0. It\'s the universal language for comparing glazes.',
    analogy: 'Like converting all recipes to percentages so you can compare apples to apples.',
    whyItMatters: 'UMF lets you predict glaze behavior, compare recipes, and troubleshoot problems scientifically.'
  }],
  ['loi', {
    term: 'LOI (Loss on Ignition)',
    plain: 'The weight a material loses during firing as water, carbonates, and organics burn away.',
    whyItMatters: 'LOI affects how thick your raw glaze layer needs to be — high-LOI glazes shrink more during firing.'
  }],
  ['thermal expansion', {
    term: 'Thermal Expansion',
    plain: 'How much a material grows when heated and shrinks when cooled. Both the clay body and glaze expand and contract.',
    analogy: 'Like how a metal lid on a jar gets easier to open when you run it under hot water.',
    whyItMatters: 'If the glaze and clay expand at different rates, you get crazing or shivering — both are defects.'
  }],
  ['fit', {
    term: 'Fit',
    plain: 'How well a glaze\'s thermal expansion matches the clay body underneath. Good fit means no crazing or shivering.',
    analogy: 'Like matching a lid to a pot — they need to be the same size.',
    whyItMatters: 'Poor glaze fit is the #1 cause of defects in functional pottery.'
  }],
  ['crazing', {
    term: 'Crazing',
    plain: 'A network of fine cracks in the glaze surface caused by the glaze contracting more than the clay body during cooling.',
    whyItMatters: 'Crazed pots aren\'t food-safe and can leak. It\'s the most common glaze defect.'
  }],
  ['crawling', {
    term: 'Crawling',
    plain: 'A defect where the glaze pulls away from the clay surface during firing, leaving bare patches. Often caused by dust, oil, or too-thick application.',
    analogy: 'Like water beading up on a waxed car — the glaze doesn\'t want to stick.',
    whyItMatters: 'Crawling ruins the look of a piece and exposes bare clay. It\'s usually preventable with clean technique.'
  }],
  ['pinholing', {
    term: 'Pinholing',
    plain: 'Tiny holes in the fired glaze surface, caused by gases escaping from the clay body during firing.',
    whyItMatters: 'Pinholes trap food and bacteria, making a piece unsuitable for functional use.'
  }],
  ['blistering', {
    term: 'Blistering',
    plain: 'Bubbles or craters in the glaze surface, caused by gases escaping too late in the firing when the glaze is already sealing over.',
    whyItMatters: 'Blistering is a sign of firing too fast or applying glaze too thick. Slowing down the firing often fixes it.'
  }],
  ['running', {
    term: 'Running',
    plain: 'When a glaze melts too much and flows down the pot, sometimes dripping onto the kiln shelf.',
    analogy: 'Like icing sliding off a warm cake.',
    whyItMatters: 'Running glaze can permanently bond your pot to the kiln shelf — an expensive mistake.'
  }],
  ['stoneware', {
    term: 'Stoneware',
    plain: 'A strong, dense clay body fired at mid to high temperatures. It\'s the standard for functional pottery.',
    whyItMatters: 'Stoneware is durable, food-safe, and the most popular choice for everyday dishes and mugs.'
  }],
  ['porcelain', {
    term: 'Porcelain',
    plain: 'A white, translucent clay body fired at high temperatures. Made primarily from kaolin, it\'s prized for its beauty but is tricky to work with.',
    analogy: 'The "fine linen" of ceramics — elegant but demanding.',
    whyItMatters: 'Porcelain shows glaze colors at their purest and can be thrown very thin, but it warps and cracks easily.'
  }],
  ['earthenware', {
    term: 'Earthenware',
    plain: 'A porous, low-fire clay body. Terra cotta is the most familiar example. It stays porous unless glazed.',
    whyItMatters: 'Earthenware is the easiest clay to work with and fires in any kiln, but it\'s less durable than stoneware.'
  }],
  ['kiln', {
    term: 'Kiln',
    plain: 'A high-temperature oven designed for firing ceramics. They can be electric, gas, or wood-fired.',
    analogy: 'Like a kitchen oven, but reaching 10x the temperature.',
    whyItMatters: 'The kiln type determines what atmospheres and temperatures you can reach, which determines your glazes.'
  }],
  ['bisque', {
    term: 'Bisque',
    plain: 'The first firing of raw clay (greenware), typically to around cone 06. It makes the clay hard but still porous enough to absorb glaze.',
    analogy: 'Like par-baking a pie crust — partially cooked to prepare it for the next step.',
    whyItMatters: 'Bisque firing is essential — it burns out organics and makes the clay strong enough to handle during glazing.'
  }],
  ['glaze fire', {
    term: 'Glaze Fire',
    plain: 'The second (and usually final) firing, where the glaze melts and fuses to the clay body.',
    whyItMatters: 'This is the firing that determines the final look and feel of your piece.'
  }],
  ['cone 6', {
    term: 'Cone 6',
    plain: 'A specific heat-work level, roughly 1220 °C (2230 °F). The most popular temperature for studio pottery.',
    whyItMatters: 'Cone 6 is the sweet spot — most electric kilns reach it easily, and there are thousands of tested recipes.'
  }],
  ['cone 10', {
    term: 'Cone 10',
    plain: 'A high-fire heat-work level, roughly 1300 °C (2380 °F). Common in gas kilns and academic programs.',
    whyItMatters: 'Cone 10 produces the strongest ware and allows reduction firing for unique glaze effects.'
  }],
  ['underglaze', {
    term: 'Underglaze',
    plain: 'Colored decoration applied to bisqueware before the glaze layer goes on. It sits between the clay and the clear glaze.',
    analogy: 'Like painting on a canvas before applying a clear varnish over the top.',
    whyItMatters: 'Underglazes let you paint detailed designs that stay vivid and protected under a glaze layer.'
  }],
  ['overglaze', {
    term: 'Overglaze',
    plain: 'Colored decoration applied on top of an already-fired glaze, then re-fired at a lower temperature.',
    whyItMatters: 'Overglazes allow very detailed, multi-color decoration, like the kind seen on fine china.'
  }],
  ['dipping', {
    term: 'Dipping',
    plain: 'A glazing technique where bisqueware is submerged in a bucket of liquid glaze for a few seconds.',
    analogy: 'Like dipping a strawberry in chocolate — quick, even, and satisfying.',
    whyItMatters: 'Dipping is the fastest way to apply an even coat of glaze and is the standard method in most studios.'
  }],
  ['batch weight', {
    term: 'Batch Weight',
    plain: 'The actual weight of each ingredient needed to make a specific amount of glaze. Calculated from the recipe percentages.',
    analogy: 'Like converting a recipe from ratios ("2 parts flour") to exact weights ("400g flour").',
    whyItMatters: 'You need batch weights to actually mix a glaze — percentages alone don\'t tell you how much to weigh out.'
  }],
  ['recipe', {
    term: 'Recipe',
    plain: 'A formula listing the ingredients and their proportions for a glaze. Usually expressed in weight percentages that add up to 100%.',
    analogy: 'Exactly like a cooking recipe, but for coating pottery.',
    whyItMatters: 'Recipes are how glazes are shared and reproduced. Learning to read them is your first step.'
  }],
])
