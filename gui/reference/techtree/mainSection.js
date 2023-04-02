class MainSection extends TechtreeUtils
{
	constructor()
	{
		super();
		
		this.rootIcon = Engine.GetGUIObjectByName("root");
		this.pairIcon = Engine.GetGUIObjectByName("pair");
		
		this.pairCaption = Engine.GetGUIObjectByName("pair_caption");
		this.rootCaption = Engine.GetGUIObjectByName("root_caption");
		
		this.pairCaption.caption = "Paired with";
		this.pairCaption.hidden = true;
	}
	
	draw(page, civCode, rootTech, techs)
	{
		if (rootTech) {
			let pairedTech;
			let pair = rootTech.paired;
			if (pair)
				pairedTech = techs[pair];
			this.pairIcon.hidden = true;
			this.pairCaption.hidden = true;
			if (pairedTech) {
				this.pairIcon.sprite = this.IconPath + pairedTech.icon;
				this.pairIcon.tooltip = this.FontType + pairedTech.name.generic + '[/font]\n' + (pairedTech.description || "");
				let that = page;
				this.pairIcon.onPress = function() {
					that.selectTech(pairedTech.name.internal);
					that.draw(civCode);
				}
				this.pairIcon.hidden = false;
				this.pairCaption.hidden = false;
			}
			this.rootIcon.sprite = this.IconPath + rootTech.icon;
			this.rootIcon.tooltip = this.FontType + rootTech.name.generic + "[/font]\n" + (rootTech.description || "");
			this.rootCaption.caption = rootTech.name.generic;
			this.rootIcon.hidden = false;
			this.rootCaption.hidden = false;
		} else {
			this.rootIcon.hidden = true;
			this.pairIcon.hidden = true;
			this.pairCaption.hidden = true;
			this.rootCaption.hidden = true;
		}
	}
	predraw(spasing)
	{
		const initIconSize = this.getInitIconSize();
		const rowSize = initIconSize.top - initIconSize.bottom;
		const leftRows = 3;
		let row = this.row;
		let root = Engine.GetGUIObjectByName("tSection");
		root.size =  "30% " + (initIconSize.top - (leftRows * rowSize)) + " 70% 98%";
		
		root = Engine.GetGUIObjectByName("pair_caption");
		let size = root.size;
		size.left = 2.5 * initIconSize.right;
		size.right = (2.5 * initIconSize.right) + 50;
		root.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		
		root = Engine.GetGUIObjectByName("root_caption");
		size = root.size;
		size.left = -100;
		size.right = 100;
		root.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		spasing += ((size.bottom - size.top) / 1.5);
		root.hidden = false;
		
		// Draw root of tree
		root = Engine.GetGUIObjectByName("root");
		size = root.size;
		size.left = -0.5 * initIconSize.right;
		size.right = 0.5 * initIconSize.right;
		root.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		root.hidden = false;
		
		// Draw pair of tree
		root = Engine.GetGUIObjectByName("pair");
		size = root.size;
		size.left = 2.5 * initIconSize.right;
		size.right = 3.5 * initIconSize.right;
		root.size = this.setBottomTopSize(size, initIconSize, row, rowSize, spasing);
		root.hidden = true;
		return spasing;
	}
}
MainSection.prototype.row = 2;