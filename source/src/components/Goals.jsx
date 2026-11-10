import React, { Component } from 'react';
import { Button, Progress, Segment, Header, Modal, Icon, Grid, Image, Form, Input, Checkbox} from 'semantic-ui-react'

import PropTypes from 'prop-types';
import Panel from './Panel';
import _ from 'lodash';


export default class Goals extends Panel {

  static propTypes = {
    appState: PropTypes.object.isRequired,
    appStateUpdate: PropTypes.func.isRequired,
    appSfx: PropTypes.func.isRequired,

    user: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    room: PropTypes.object.isRequired,

    serverUpdate: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);


    this.state = {
      donationModal: false,
      formModal: false,
      tipLast: 0,
      maxIndex: 0,

      //form
      name: '',
      description: '',
      independent: true,
      order: 0,
      action: 'Save',
    };

    this.devMode = props.appState.devMode;
    this.scrollableRef = React.createRef();

    this.goal = {name: 'none', description: 'none', independent: 'false'}
    this.maxIndex = 0;

    if (this.devMode) console.log('components/Goals constructor room:', props.room);
  }

  componentDidMount() {
  }

  componentWillUnmount() {
    console.log('components/Goals componentWillUnmount');
  }

  donationModalClose = () => this.setState({ donationModal: false })
  formModalClose = () => this.setState({ formModal: false })

  onClick(e, { name, value }) {
    const { state, props } = this;

    if (this.devMode) console.log("components/Goals onClick", name, value, e);
    var action;

    switch (name) {
      case 'tip':
        if (typeof value === 'undefined') break; //unidentified

        const tipIndex = parseInt(value);

        if (props.room.tips) if (props.room.tipOptions.length > 0) if (props.room.tipOptions.length > tipIndex) {
          const tipOption = props.room.tipOptions[tipIndex];

          if (this.goal.independent) props.serverUpdate({ task: 'tip', tip: tipOption, tipsURL: props.room.tipsURL, targetID: props.room.performerID, independent: this.goal.name, index: this.index });
          else props.serverUpdate({ task: 'tip', tip: tipOption, tipsURL: props.room.tipsURL, targetID: props.room.performerID });

          this.setState({ donationModal: false, tipLast: Date.now() });

          console.log("components/Goals sending tip", tipOption, tipIndex);

        }
        break;

    }
  }
 
  menuClick(e, { action }) {
    const { state, props } = this;

    if (this.devMode) console.log("components/Goals menuClick", action, state, props.room );

    switch (action) {
      case 'add':
        this.setState({ formModal: true, action: this.txt('Add'), name: '', description: '', independent: true, amount: 10, order: this.maxIndex + 1 });
        break;

      case 'sort':
         this.props.serverUpdate({task:'options', 'name': 'goals_sort', 'value': ! this.props.room.options.room.fields.goals_sort.value});
        break;

        break;
      case 'reset':
        this.props.serverUpdate({ task: 'goals_reset'});
        break;
    }
  }


  goalClick = goal => (event, data) => 
    {
      console.log('components/Goals donateClick',  goal, data, event);

      switch (data.action) {

        case 'donate':
          this.goal = goal;
          this.index = data.ix;
          this.independent = true;
          if (goal) this.setState({donationModal: true});
          //this.props.serverUpdate({ task: 'goal_donate', goal: goal, index: data.ix });
          break;

        case 'complete':
            this.props.serverUpdate({ task: 'goal_complete', goal: goal, index: data.ix });
        break; 
 
        case 'delete':
          this.props.serverUpdate({ task: 'goal_delete', goal: goal, index: data.ix });
         break; 

      }
    }

    onChange = (event, data) => {


      const value = data.type === 'checkbox' ? data.checked : data.value;
      const name = data.name;
      if (this.devMode)  console.log('Components/Goals onChange', name, value, data);

      var newValue = value;
      if (name == 'order' || name == 'amount') 
      {
       newValue = parseInt(value);
      if (isNaN(newValue)) newValue = 0;
      }

      if (name) this.setState({
        [name]: newValue,
    });

  }

  formSave = (event, data) => {
    if (this.devMode)  console.log('Components/Goals formSave', data);
    
    this.props.serverUpdate({ task: 'goal_add', name: this.state.name, description: this.state.description, amount: this.state.amount, independent: this.state.independent, order: this.state.order });

    this.setState({ formModal: false });
  }

  render() {

   //  if (this.devMode) console.log('components/Users render:', this.data);

    const { props, state, txt } = this;
    this.devMode = props.appState.devMode; //also update devMode on rendering updates


    String.prototype.stripSlashes = function(){
      return this.replace(/\\(.)/mg, "$1");
  }
    var goalList = [];

    var sortCode ='';
    if (this.props.room.options) if (this.props.room.options) if (this.props.room.options.room.fields.goals_sort) sortCode = (<Button key='sort' action='sort' onClick={this.menuClick.bind(this)} className={props.appState.className} size='small'> <Icon name={this.props.room.options.room.fields.goals_sort.value?'sort amount down':'sort numeric down'} /> {txt('Sort')}</Button>) 


    var menu = '';
    if (props.room.goalsManage) menu = (<div key='goalMenu'> &nbsp;&nbsp;
    <Button key='addGoal' action='add' onClick={this.menuClick.bind(this)} className={props.appState.className} size='small'> <Icon name='plus' /> {txt('Add')}</Button>
    {sortCode}
    <Button key='resetGoals' action='reset' color='red' onClick={this.menuClick.bind(this)} className={props.appState.className} size='small'> <Icon name='eraser' /> {txt('Reset All Contributions')}</Button>  
    </div>
    );
  
    if (props.room.goals)
    //for (var i = 0; i < props.room.goals.length; i++)
      for (var i in props.room.goals) 
      {

        if (!props.room.goals[i].hasOwnProperty('name')) 
        {
          console.log('components/Goals missing name', i, this.data);
          continue;
        }
        var goal = props.room.goals[i];

        if (this.maxIndex < parseInt(goal.ix)) this.maxIndex = parseInt(goal.ix);

        var buttonCode = [];

       // var goal = props.room.goals[ix];
        if (goal) 
        if (goal.name)
        {
    
          if (props.room.goal) if (props.room.goal.name == goal.name && !goal.independent) buttonCode.push(<Button key='donate' size='tiny' action='donate' ix={goal.ix} onClick={this.goalClick(goal)} className={props.appState.className} disabled={ (Date.now() - state.tipLast < 5000) } >{this.txt('Donate')}</Button>);
         
          if (goal.independent) buttonCode.push(<Button key='independent' size='tiny' action='donate' ix={goal.ix} onClick={this.goalClick(goal)} className={props.appState.className} disabled={ (Date.now() - state.tipLast < 5000) }><Icon name='gift' /> {this.txt('Donate')}</Button>);

          if (props.room.goalsComplete) buttonCode.push(<Button key="complete" size='tiny' action='complete' ix={goal.ix} onClick={this.goalClick(goal)} className={props.appState.className} ><Icon name='check' /> {this.txt('Complete')}</Button>);

          if (props.room.goalsManage) buttonCode.push(<Button key="delete" size='tiny' action='delete' ix={goal.ix} onClick={this.goalClick(goal)} className={props.appState.className} ><Icon name='remove' /> {this.txt('Delete')}</Button>);
          
        goalList.push(<Segment size='small' key={"goal" + goal.ix} className={props.appState.className}><Header as='h4'>#{goal.ix} {goal.name} <Icon size='small' name={goal.independent?'random':'linkify'} />  </Header>
        <Progress className={props.appState.className} value={goal.current} total={goal.amount} indicating progress='ratio' size='small'>{goal.description}</Progress>
        {buttonCode}
        </Segment>)
         }
      }
    else goalList = (
      <Segment key="No_Users">
        No goals.
      </Segment>
    );

    var buffer = [];
    var tipOptions ;
    var tipNumber ;

        // Tips
        if (props.room.tipOptions.length > 0) {
          tipNumber = 0;
    
          tipOptions = (<>
            {props.room.tipOptions.map((tipOption, tipIndex) => {
    
              if (tipOption['tag'] === 'TIP')
                if (tipOption['attributes']['AMOUNT'] !== 'custom') {
                  tipNumber++;
                  return (<Grid.Column className={props.appState.className} key={'tip' + tipIndex} textAlign='center'>
    
                    <Header as='h4' className={props.appState.className}>
                {tipOption['attributes']['IMAGE']?<Image src={props.room.tipsURL + tipOption['attributes']['IMAGE']} size="mini" rounded verticalAlign="middle" />:''} {tipOption['attributes']['AMOUNT']}
                    </Header>
    
                    <b>{tipOption['attributes']['LABEL']}</b>
                    <div>{tipOption['attributes']['NOTE']}</div>
                    <div >
                      <Button compact className={props.appState.className} size="small" color="olive" name={'tip'} value={tipIndex} onClick={this.onClick.bind(this)}>{txt('Gift')}</Button>
                     </div>
                  </Grid.Column>);
                }
            })
            }
          </>);
        }

    buffer.push(<Modal key='donationModal' closeIcon
    className={props.appState.className}
    open={state.donationModal}
    onClose={this.donationModalClose}
    size='small'
  >
    <Header icon='gift' content={txt("Donate")}  />
    <Modal.Content>
      <h3>{this.goal.name}</h3>
      {this.goal.description}
      <Grid className={props.appState.className} stackable centered divided columns={tipNumber} style={{overflow: 'auto', maxHeight: 180, maxWidth: 480 }}>
      {tipOptions}
      </Grid>
    </Modal.Content>
    <Modal.Actions>

      <Button color='red' onClick={this.donationModalClose}>
        <Icon name='remove' /> {txt('Nevermind')}
      </Button>

    </Modal.Actions>
  </Modal>
  );


  buffer.push(<Modal key='formModal' closeIcon
  className={props.appState.className}
  open={state.formModal}
  onClose={this.formModalClose}
  size='small'
>
  <Header icon={props.config.goals_icon?props.config.goals_icon:'gift'} content={state.action}  />
  <Modal.Content>
        <Form className={props.appState.className}>
       
        <Form.Field>
        <label>{txt('Name')}</label>
        <Input inverted={props.appState.darkMode} name="name" value={state.name} onChange={this.onChange} type="text" placeholder={txt('Name')} />
        </Form.Field>

        <Form.Field>
        <label>{txt('Description')}</label>
        <Input inverted={props.appState.darkMode} name="description" value={state.description} onChange={this.onChange} type="text" placeholder={txt('Description')} />
        </Form.Field>

        <Form.Field>
        <label>{txt('Amount')} <Icon name='money' /></label>
        <Input inverted={props.appState.darkMode} name="amount" value={String(state.amount)} onChange={this.onChange} type="text" placeholder={txt('Amount')} />
        </Form.Field>

        <Form.Field>
        <label>{txt('Order')} <Icon name='sort numeric down' /> </label>
        <Input inverted={props.appState.darkMode} name="order" value={String(state.order)} onChange={this.onChange} type="text" placeholder={txt('Order')} />
        </Form.Field>

       <Form.Field>
       <label>{txt('Independent')} <Icon name='random' /> </label>
       <Checkbox name="independent" toggle checked={state.independent} onChange={this.onChange} />
      </Form.Field>

        </Form>
  </Modal.Content>
  <Modal.Actions>

    <Button color='red' onClick={this.formModalClose}>
      <Icon name='remove' /> {txt('Nevermind')}
    </Button>

    <Button color='green' onClick={this.formSave}>
      <Icon name='send' /> {state.action}
    </Button>

  </Modal.Actions>
</Modal>
);

    return (
      <div className="layoutList" key="layoutList" style={{ backgroundColor: props.appState.backgroundColor }}>
        <div className="layScrollable" key="layScrollable" ref={this.scrollableRef} ><Segment.Group size='small'>{goalList}</Segment.Group></div>
        <div className="layMenu">{menu}</div>
        {buffer}
      </div>
    );
  }



}
