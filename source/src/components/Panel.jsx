import React, { Component } from 'react';


export default class Panel extends Component {

	//handles panel size updates, aspect ratio (for resizing elements)
	//requires content in <div className="panel" ref={container => (this.state.container = container)}> 

	constructor(props) {
		//	console.log('components/Panel constructor', props);

		super(props);

		this.state = {

			container: null,
			width: 0,
			height: 0,
			aspectRatio: 0,

			settingsActive: true,
		}

		this.devMode = props.appState.devMode;

	}

	txt = (text) => {
		//handle text translations from config
		const { props } = this;
		if (text in props.config.text) return props.config.text[text];

		return text;
	}

	componentDidMount() {
		this.updateSize();

		window.addEventListener("resize", this.updateSize, false);
		document.addEventListener("onfullscreenchange", this.updateSize, false)

		document.addEventListener('webkitfullscreenchange', this.updateSize, false)
		document.addEventListener('mozfullscreenchange', this.updateSize, false)
		document.addEventListener('msfullscreenchange', this.updateSize, false)
		document.addEventListener('MSFullscreenChange', this.updateSize, false) //IE11
		document.addEventListener('fullscreenchange', this.updateSize, false)
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.updateSize);
		document.removeEventListener("onfullscreenchange", this.updateSize);

		document.removeEventListener('webkitfullscreenchange', this.updateSize)
		document.removeEventListener('mozfullscreenchange', this.updateSize)
		document.removeEventListener('msfullscreenchange', this.updateSize)
		document.removeEventListener('MSFullscreenChange', this.updateSize)
		document.removeEventListener('fullscreenchange', this.updateSize)
	}


	static getDerivedStateFromProps(props, state) {
		//detect and update panel size / aspect if incorrect
		if (state.container) {
			let width = state.container.clientWidth;
			let height = state.container.clientHeight;
			if (!height) height = 1;

			if (state.width !== width || state.height !== height) {
				const aspectRatio = width / height;

				const newState = { aspectRatio: aspectRatio, width: width, height: height };
				if (props.appState.devMode) console.log('components/Panel getDerivedStateFromProps size update', newState, state);

				return newState;
			}

		}

		return null;
	}



	updateSize = () => {
		var { state } = this;

		if (state.container) {
			let width = state.container.clientWidth;
			let height = state.container.clientHeight;
			if (!height) height = 1;

			const aspectRatio = width / height;

			this.setState({ aspectRatio: aspectRatio, width: width, height: height });
		}

		//if (this.devMode) console.log('components/Panel containerResized', state);
	}

	onClick(e, { name, value }) {
		const { state } = this;

		if (name === 'settings') this.setState(settingsActive => ({ settingsActive: !state.settingsActive }));

		if (this.devMode) console.log("components/Panel onClick ", name, value, e, state);
	}



}